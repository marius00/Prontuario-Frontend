import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users, Layers, Plus, Trash2, RotateCcw } from 'lucide-react';

export default function AdminPage() {
  const { users, sectors, addUser, addSector, resetUserPassword, deactivateUser, disableSector } = useApp();
  const { toast } = useToast();
  
  // User management state
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserSector, setNewUserSector] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'staff'>('staff');

  // Sector management state
  const [showAddSectorDialog, setShowAddSectorDialog] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorCode, setNewSectorCode] = useState('');

  const handleAddUser = () => {
    if (!newUserName || !newUserSector) {
      toast({
        title: "Erro",
        description: "Nome e setor são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    addUser(newUserName, newUserSector, newUserRole);
    toast({
      title: "Sucesso",
      description: "Usuário adicionado com sucesso.",
    });

    setNewUserName('');
    setNewUserSector('');
    setNewUserRole('staff');
    setShowAddUserDialog(false);
  };

  const handleResetPassword = (userId: string, userName: string) => {
    resetUserPassword(userId);
    toast({
      title: "Sucesso",
      description: `Senha de ${userName} foi resetada.`,
    });
  };

  const handleDeactivateUser = (userId: string, userName: string) => {
    deactivateUser(userId);
    toast({
      title: "Sucesso",
      description: `Usuário ${userName} foi desativado.`,
    });
  };

  const handleAddSector = () => {
    if (!newSectorName || !newSectorCode) {
      toast({
        title: "Erro",
        description: "Nome e código da setor são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    addSector(newSectorName, newSectorCode.toUpperCase());
    toast({
      title: "Sucesso",
      description: "Setor adicionado com sucesso.",
    });

    setNewSectorName('');
    setNewSectorCode('');
    setShowAddSectorDialog(false);
  };

  const handleDisableSector = (sectorId: string, sectorName: string) => {
    disableSector(sectorId);
    toast({
      title: "Sucesso",
      description: `Setor ${sectorName} foi desativado.`,
    });
  };

  const activeUsers = users.filter(u => u.active !== false);
  const activeSectors = sectors.filter(s => s.active !== false);

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários e setores do sistema</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="sectors">Setores</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-4">
          <Button onClick={() => setShowAddUserDialog(true)} className="w-full" data-testid="button-add-user">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Usuário
          </Button>

          <div className="space-y-3">
            {activeUsers.map(user => (
              <div key={user.id} className="border rounded-lg p-4 bg-card" data-testid={`card-user-${user.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{user.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {user.role === 'admin' ? 'Administrador' : 'Equipe'} • Setor: {sectors.find(s => s.id === user.sectorId)?.name}
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-primary/10 px-2 py-1 rounded text-primary">
                    {user.role === 'admin' ? 'ADMIN' : 'STAFF'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleResetPassword(user.id, user.name)}
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    data-testid={`button-reset-password-${user.id}`}
                  >
                    <RotateCcw className="mr-2 h-3 w-3" />
                    Resetar Senha
                  </Button>
                  <Button 
                    onClick={() => handleDeactivateUser(user.id, user.name)}
                    variant="destructive" 
                    size="sm" 
                    className="flex-1"
                    data-testid={`button-deactivate-user-${user.id}`}
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Desativar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sectors" className="space-y-4 mt-4">
          <Button onClick={() => setShowAddSectorDialog(true)} className="w-full" data-testid="button-add-sector">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Setor
          </Button>

          <div className="space-y-3">
            {activeSectors.map(sector => (
              <div key={sector.id} className="border rounded-lg p-4 bg-card" data-testid={`card-sector-${sector.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{sector.name}</h3>
                    <p className="text-xs text-muted-foreground">Código: {sector.code}</p>
                  </div>
                  <span className="text-xs font-mono bg-secondary px-2 py-1 rounded">
                    {sector.code}
                  </span>
                </div>
                <Button 
                  onClick={() => handleDisableSector(sector.id, sector.name)}
                  variant="destructive" 
                  size="sm" 
                  className="w-full"
                  data-testid={`button-disable-sector-${sector.id}`}
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Desativar Setor
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie uma nova conta de usuário no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nome</Label>
              <Input
                id="user-name"
                placeholder="Nome do usuário"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                data-testid="input-user-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-sector">Setor</Label>
              <Select value={newUserSector} onValueChange={setNewUserSector}>
                <SelectTrigger id="user-sector" data-testid="select-user-sector">
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.filter(s => s.active !== false).map(sector => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Função</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as 'admin' | 'staff')}>
                <SelectTrigger id="user-role" data-testid="select-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Equipe</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)} data-testid="button-cancel-user">
              Cancelar
            </Button>
            <Button onClick={handleAddUser} data-testid="button-save-user">
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Sector Dialog */}
      <Dialog open={showAddSectorDialog} onOpenChange={setShowAddSectorDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Setor</DialogTitle>
            <DialogDescription>
              Crie um novo setor no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sector-name">Nome</Label>
              <Input
                id="sector-name"
                placeholder="Nome do setor"
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
                data-testid="input-sector-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector-code">Código</Label>
              <Input
                id="sector-code"
                placeholder="Código (ex: ADM)"
                value={newSectorCode}
                onChange={(e) => setNewSectorCode(e.target.value.toUpperCase())}
                data-testid="input-sector-code"
                maxLength={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSectorDialog(false)} data-testid="button-cancel-sector">
              Cancelar
            </Button>
            <Button onClick={handleAddSector} data-testid="button-save-sector">
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
