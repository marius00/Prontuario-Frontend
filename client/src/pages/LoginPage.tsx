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
  
  // Simplified login mock - just picking a user ID
  // In real app, this would be auth flow.
  // We'll hardcode "mock users" associated with sectors for the demo dropdown
  
  const mockUsers = [
    { id: 'u1', name: 'Alice (Admissions)', sectorId: 's1' },
    { id: 'u2', name: 'Bob (Radiology)', sectorId: 's2' },
    { id: 'u3', name: 'Charlie (Cardiology)', sectorId: 's3' },
    { id: 'u4', name: 'Dana (Archives)', sectorId: 's4' },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
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
          <CardDescription>Secure Document Tracking System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Select User Role</Label>
              <Select onValueChange={setSelectedUser}>
                <SelectTrigger id="user" className="h-12">
                  <SelectValue placeholder="Select a user..." />
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
            <Button type="submit" className="w-full h-12 text-lg" disabled={!selectedUser}>
              Login
            </Button>
            <div className="text-center text-xs text-muted-foreground mt-4">
              Offline-First PWA Ready
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
