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
  const [selectedUsername, setSelectedUsername] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState<{ name: string; sectorId: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        setError('');

        const query = `query {\n  listUsers {\n    username\n    sector\n  }\n}`;
        const json = await graphqlFetch<{ listUsers: { username: string; sector: string }[] }>({ query });

        if (json.errors) {
          throw new Error(json.errors[0]?.message || 'Erro desconhecido ao carregar usuários');
        }

        const apiUsers = (json.data?.listUsers ?? []).map((u) => ({
          name: u.username,
          sectorId: u.sector,
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

    if (!selectedUsername || !selectedSector || !password) {
      setError('Por favor, selecione um usuário e insira a senha');
      return;
    }

    try {
      setSubmitting(true);

      const mutation = `mutation Login($username: String!, $sector: String!, $password: String!) {\n  login(username: $username, sector: $sector, password: $password) {\n    success\n    token\n  }\n}`;

      const json = await graphqlFetch<{ login: { success: boolean; token?: string } }>({
        query: mutation,
        variables: {
          username: selectedUsername,
          sector: selectedSector,
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
        role: whoAmI.roles?.some((r) => r.role === 'admin') ? 'admin' : 'staff',
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
    setSelectedUsername(value);
    const found = users.find((u) => u.name === value);
    setSelectedSector(found?.sectorId ?? '');
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
                    <SelectItem key={user.name} value={user.name}>
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground">({user.sectorId})</span>
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
