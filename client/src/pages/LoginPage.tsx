import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, UserCircle } from 'lucide-react';

export default function LoginPage() {
  const { sectors, login } = useApp();
  const [, setLocation] = useLocation();
  const [selectedUser, setSelectedUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Simplified login mock - just picking a user ID
  // In real app, this would be auth flow.
  // We'll hardcode "mock users" associated with sectors for the demo dropdown
  
  const mockUsers = [
    { id: 'u1', name: 'Alice (Admissão)', sectorId: 's1' },
    { id: 'u2', name: 'Bob (Radiologia)', sectorId: 's2' },
    { id: 'u3', name: 'Carlos (Cardiologia)', sectorId: 's3' },
    { id: 'u4', name: 'Daniela (Arquivo)', sectorId: 's4' },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedUser || !password) {
      setError('Por favor, insira usuário e senha');
      return;
    }

    // Mock password check
    if (password !== 'password') {
      setError('Senha inválida (dica: use "password")');
      return;
    }

    if (selectedUser) {
      login(selectedUser);
      setLocation('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">DocLocate</CardTitle>
          <CardDescription>Sistema de Rastreamento de Documentos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Selecionar Usuário</Label>
              <Select onValueChange={setSelectedUser}>
                <SelectTrigger id="user" className="h-12">
                  <SelectValue placeholder="Selecione um usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-muted-foreground" />
                        <span>{user.name}</span>
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

            <Button type="submit" className="w-full h-12 text-lg">
              Entrar
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
