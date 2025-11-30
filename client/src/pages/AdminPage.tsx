import React, { useState } from 'react';
import { useApp } from '@/lib/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Users, Layers, Plus, Trash2, RotateCcw, Menu, Copy, Check } from 'lucide-react';

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

  // Password reset state
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Password display state (for new user creation)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [createdUserName, setCreatedUserName] = useState('');

  // User deactivation confirmation state
  const [showDeactivateUserDialog, setShowDeactivateUserDialog] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<{ username: string; name: string } | null>(null);

  // Password reset confirmation state
  const [showResetPasswordConfirmDialog, setShowResetPasswordConfirmDialog] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<{ username: string; name: string } | null>(null);

  const [copySuccess, setCopySuccess] = useState(false);

  const handleAddUser = async () => {
    if (!newUserName || !newUserSector) {
      toast({
        title: "Erro",
        description: "Nome e setor são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await addUser(newUserName, newUserSector, newUserRole);

      if (result.success && result.password) {
        // Show success message
        toast({
          title: "Sucesso",
          description: "Usuário adicionado com sucesso.",
        });

        // Set password modal data and show it
        setCreatedUserName(newUserName);
        setGeneratedPassword(result.password);
        setShowPasswordModal(true);

        // Clear form and close add user dialog
        setNewUserName('');
        setNewUserSector('');
        setNewUserRole('staff');
        setShowAddUserDialog(false);
      } else {
        toast({
          title: "Erro",
          description: result.error || "Falha ao adicionar usuário.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error('Erro ao adicionar usuário', err);
      toast({
        title: "Erro",
        description: "Erro inesperado ao adicionar usuário.",
        variant: "destructive"
      });
    }
  };



  const handleResetPassword = (username: string, userName: string) => {
    setUserToResetPassword({ username, name: userName });
    setShowResetPasswordConfirmDialog(true);
  };

  const confirmResetPassword = async () => {
    if (!userToResetPassword) return;

    try {
      const result = await resetUserPassword(userToResetPassword.username);

      if (result.success && result.password) {
        setNewPassword(result.password);
        setResetPasswordUser({ id: userToResetPassword.username, name: userToResetPassword.name });
        setShowResetPasswordDialog(true);
        setShowResetPasswordConfirmDialog(false);
        setUserToResetPassword(null);

        toast({
          title: "Sucesso",
          description: "Senha resetada com sucesso.",
        });
      } else {
        toast({
          title: "Erro",
          description: result.error || "Falha ao resetar senha.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error('Erro ao resetar senha', err);
      toast({
        title: "Erro",
        description: "Erro inesperado ao resetar senha.",
        variant: "destructive"
      });
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCopyGeneratedPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDeactivateUser = (username: string, userName: string) => {
    setUserToDeactivate({ username, name: userName });
    setShowDeactivateUserDialog(true);
  };

  const confirmDeactivateUser = async () => {
    if (!userToDeactivate) return;

    try {
      const result = await deactivateUser(userToDeactivate.username);

      if (result.success) {
        toast({
          title: "Sucesso",
          description: `Usuário ${userToDeactivate.name} foi desativado.`,
        });
        setShowDeactivateUserDialog(false);
        setUserToDeactivate(null);
      } else {
        toast({
          title: "Erro",
          description: result.error || "Falha ao desativar usuário.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error('Erro ao desativar usuário', err);
      toast({
        title: "Erro",
        description: "Erro inesperado ao desativar usuário.",
        variant: "destructive"
      });
    }
  };

  const handleAddSector = async () => {
    if (!newSectorName || !newSectorCode) {
      toast({
        title: "Erro",
        description: "Nome e código da setor são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await addSector(newSectorName, newSectorCode.toUpperCase());

      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Setor adicionado com sucesso.",
        });

        setNewSectorName('');
        setNewSectorCode('');
        setShowAddSectorDialog(false);
      } else {
        toast({
          title: "Erro",
          description: result.error || "Falha ao adicionar setor.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error('Erro ao adicionar setor', err);
      toast({
        title: "Erro",
        description: "Erro inesperado ao adicionar setor.",
        variant: "destructive"
      });
    }
  };

  const handleDisableSector = async (sectorId: string, sectorName: string) => {
    try {
      const result = await disableSector(sectorName); // Use sectorName instead of sectorId since API expects name

      if (result.success) {
        toast({
          title: "Sucesso",
          description: `Setor ${sectorName} foi desativado.`,
        });
      } else {
        toast({
          title: "Erro",
          description: result.error || "Falha ao desativar setor.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error('Erro ao desativar setor', err);
      toast({
        title: "Erro",
        description: "Erro inesperado ao desativar setor.",
        variant: "destructive"
      });
    }
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
                    <h3 className="font-semibold text-lg">{user.username}</h3>
                    <p className="text-xs text-muted-foreground">
                      {user.role === 'admin' ? 'Administrador' : 'Equipe'} • Setor: {sectors.find(s => s.name === user.sector.name)?.name}
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-primary/10 px-2 py-1 rounded text-primary">
                    {user.role === 'admin' ? 'ADMIN' : 'STAFF'}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full" data-testid={`button-user-menu-${user.id}`}>
                      <Menu className="mr-2 h-4 w-4" />
                      Ações
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleResetPassword(user.username, user.username)} data-testid={`menu-reset-password-${user.id}`}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Resetar Senha
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeactivateUser(user.username, user.username)} className="text-destructive focus:text-destructive" data-testid={`menu-deactivate-${user.id}`}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Desativar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
              <div key={sector.name} className="border rounded-lg p-4 bg-card" data-testid={`card-sector-${sector.name}`}>
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
                  onClick={() => handleDisableSector(sector.name, sector.name)}
                  variant="destructive" 
                  size="sm" 
                  className="w-full"
                  data-testid={`button-disable-sector-${sector.name}`}
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
                    <SelectItem key={sector.name} value={sector.name}>
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

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Senha Resetada</DialogTitle>
            <DialogDescription>
              Nova senha de {resetPasswordUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newPassword}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-new-password-display"
                />
                <Button
                  onClick={handleCopyPassword}
                  variant="outline"
                  size="sm"
                  data-testid="button-copy-password"
                >
                  {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Clique no ícone para copiar a senha.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResetPasswordDialog(false)} data-testid="button-close-password-dialog">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated Password Display Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Usuário Criado</DialogTitle>
            <DialogDescription>
              Senha gerada para {createdUserName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sua senha:</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={generatedPassword}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-generated-password-display"
                />
                <Button
                  onClick={handleCopyGeneratedPassword}
                  variant="outline"
                  size="sm"
                  data-testid="button-copy-generated-password"
                >
                  {copySuccess ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Esta é uma senha única. Clique no ícone para copiar.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPasswordModal(false)} data-testid="button-close-generated-password-dialog">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Deactivation Confirmation Dialog */}
      <Dialog open={showDeactivateUserDialog} onOpenChange={setShowDeactivateUserDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Desativação</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar o usuário {userToDeactivate?.name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Esta ação irá desativar permanentemente o usuário. O usuário não poderá mais fazer login no sistema.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeactivateUserDialog(false)}
              data-testid="button-cancel-deactivate-user"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivateUser}
              data-testid="button-confirm-deactivate-user"
            >
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Confirmation Dialog */}
      <Dialog open={showResetPasswordConfirmDialog} onOpenChange={setShowResetPasswordConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Reset de Senha</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja resetar a senha do usuário {userToResetPassword?.name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Uma nova senha será gerada automaticamente para o usuário. A senha atual será invalidada imediatamente.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetPasswordConfirmDialog(false)}
              data-testid="button-cancel-reset-password"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmResetPassword}
              data-testid="button-confirm-reset-password"
            >
              Resetar Senha
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
