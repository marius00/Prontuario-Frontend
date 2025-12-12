import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { LayoutDashboard, PlusCircle, Search, User, LogOut, Lock, Settings } from 'lucide-react';
import { useApp } from '../lib/store';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, sectors, resetOwnPassword } = useApp();
  const [location] = useLocation();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();

  if (!currentUser) {
    // This should not happen with AuthGuard, but just in case
    return null;
  }

  const currentSector = sectors.find(s => s.name === currentUser.sector.name);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não correspondem.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    try {
      const result = await resetOwnPassword(currentPassword, newPassword);

      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Senha alterada com sucesso.",
        });

        setShowPasswordDialog(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast({
          title: "Erro",
          description: result.error || "Falha ao alterar senha.",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      console.error('Erro ao alterar senha', err);
      toast({
        title: "Erro",
        description: "Erro inesperado ao alterar senha.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-14 items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono">
              {(currentUser.sector.code ?? currentUser.sector.name.toUpperCase()).substring(0, 3)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none">{currentUser.sector.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{currentUser.username}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <User className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowPasswordDialog(true)} className="cursor-pointer">
                <Lock className="mr-2 h-4 w-4" />
                Alterar Senha
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout().catch(console.error)} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua senha atual e a nova senha que deseja utilizar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Digite sua senha atual"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Digite sua nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} data-testid="button-save-password">
              Alterar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1 p-4 container max-w-md mx-auto">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card z-50 pb-safe">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
          <Link to="/" className={cn("flex flex-col items-center gap-1 p-2 rounded-lg transition-colors", location === '/' ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            <LayoutDashboard className="h-6 w-6" />
            <span className="text-[10px] font-medium">Painel</span>
          </Link>
          <Link to="/register" className={cn("flex flex-col items-center gap-1 p-2 rounded-lg transition-colors", location === '/register' ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            <PlusCircle className="h-6 w-6" />
            <span className="text-[10px] font-medium">Registrar</span>
          </Link>
          <Link to="/search" className={cn("flex flex-col items-center gap-1 p-2 rounded-lg transition-colors", location === '/search' ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
            <Search className="h-6 w-6" />
            <span className="text-[10px] font-medium">Buscar</span>
          </Link>
          {currentUser?.role === 'admin' && (
            <Link to="/admin" className={cn("flex flex-col items-center gap-1 p-2 rounded-lg transition-colors", location === '/admin' ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Settings className="h-6 w-6" />
              <span className="text-[10px] font-medium">Administrar</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
