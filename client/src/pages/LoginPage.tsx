import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/store';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, UserCircle, HeartPulse } from 'lucide-react';
import { saveAuthToken, saveUserProfile, StoredUserProfile } from '@/lib/indexedDb';
import { graphqlFetch } from '@/lib/graphqlClient';
import {User} from "@/lib/types.ts";

export default function LoginPage() {
  const { currentUser, sectors, login } = useApp();
  const [, setLocation] = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState<{ id: number; username: string; sector: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        setError('');

        const query = `query {\n  listUsers {\n    id\n    username\n    sector\n  }\n}`;
        const json = await graphqlFetch<{ listUsers: { id: number; username: string; sector: string }[] }>({ query });

        if (json.errors) {
          throw new Error(json.errors[0]?.message || 'Erro desconhecido ao carregar usuários');
        }

        const apiUsers = (json.data?.listUsers ?? []).map((u) => ({
          id: u.id,
          username: u.username,
          sector: u.sector,
        }));

        setUsers(apiUsers);
      } catch (err: any) {
        console.error('Erro ao buscar usuários', err);
        setError(err.message || 'Não foi possível carregar a lista de usuários');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const selectedUser = users.find((u) => u.id === selectedUserId);

    if (!selectedUser || !password) {
      setError('Por favor, selecione um usuário e insira a senha');
      return;
    }

    try {
      setSubmitting(true);

      const mutation = `mutation Login($username: String!, $sector: String!, $password: String!) {\n  login(username: $username, sector: $sector, password: $password) {\n    success\n    token\n  }\n}`;

      const json = await graphqlFetch<{ login: { success: boolean; token?: string } }>({
        query: mutation,
        variables: {
          username: selectedUser.username,
          sector: selectedUser.sector,
          password,
        },
      });

      if (json.errors) {
        throw new Error(json.errors[0]?.message || 'Erro desconhecido ao fazer login');
      }

      const result = json.data?.login;

      if (!result?.success) {
        setError('Senha invalida');
        return;
      }

      if (!result.token) {
        throw new Error('Resposta inesperada da API: token ausente');
      }

      await saveAuthToken(result.token);

      // Fetch user details via whoAmI using the newly stored token
      const whoAmIQuery = `query {
        whoAmI {
            id
            isAuthenticated
                roles {
              role
              level
            }
            sector {
              code
              name
            }
            username
          }
        }`;

      const whoAmIResponse = await graphqlFetch<{ whoAmI: StoredUserProfile }>({
        query: whoAmIQuery,
      });

      if (whoAmIResponse.errors) {
        throw new Error(whoAmIResponse.errors[0]?.message || 'Erro ao obter dados do usuário');
      }

      const whoAmI = whoAmIResponse.data?.whoAmI;
      if (!whoAmI || !whoAmI.isAuthenticated) {
        throw new Error('Não foi possível autenticar o usuário');
      }

      await saveUserProfile(whoAmI);

      // Log in the app store using the backend user id
      const mappedUser: User = {
        id: whoAmI.id,
        username: whoAmI.username,
        sector: { name: whoAmI.sector.name, code: whoAmI.sector.code },
        role: whoAmI.roles?.some((r) => r.role === 'ADMIN') ? 'admin' : 'staff',
        active: true,
      };

      login(mappedUser);
      setLocation('/');
    } catch (err: any) {
      console.error('Erro no login', err);
      if (!error) {
        setError(err.message || 'Não foi possível realizar o login');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserChange = (value: string) => {
    const id = Number(value);
    if (!Number.isNaN(id)) {
      setSelectedUserId(id);
    } else {
      setSelectedUserId(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <HeartPulse className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Protocolo Digital</CardTitle>
          <CardDescription>Sistema de Rastreamento de Documentos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Selecionar Usuário</Label>
              <Select onValueChange={handleUserChange} disabled={loadingUsers || users.length === 0}>
                <SelectTrigger id="user" className="h-12">
                  <SelectValue placeholder={loadingUsers ? 'Carregando usuários...' : 'Selecione um usuário...'} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <span>{user.username}</span>
                        <span className="text-xs text-muted-foreground">({user.sector})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="h-12"
              />
            </div>

            {error && (
              <div className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded text-center">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-lg" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </Button>
            <div className="text-center text-xs text-muted-foreground mt-4">
              Pronto para uso Offline (PWA)
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
