import React from 'react';
import { useLocation, Link } from 'wouter';
import { LayoutDashboard, PlusCircle, Search, LogOut } from 'lucide-react';
import { useApp } from '../lib/store';
import { cn } from '@/lib/utils';

export function Layout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout, sectors } = useApp();
  const [location] = useLocation();

  if (!currentUser) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const currentSector = sectors.find(s => s.id === currentUser.sectorId);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-14 items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold font-mono">
              {currentSector?.code.substring(0, 1)}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-none">{currentSector?.name}</span>
              <span className="text-xs text-muted-foreground font-mono">{currentUser.name}</span>
            </div>
          </div>
          <button onClick={logout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 container max-w-md mx-auto">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card z-50 pb-safe">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto">
          <Link href="/">
            <a className={cn("flex flex-col items-center gap-1 p-2 rounded-lg transition-colors", location === '/' ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <LayoutDashboard className="h-6 w-6" />
              <span className="text-[10px] font-medium">Painel</span>
            </a>
          </Link>
          <Link href="/register">
            <a className={cn("flex flex-col items-center gap-1 p-2 rounded-lg transition-colors", location === '/register' ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <PlusCircle className="h-6 w-6" />
              <span className="text-[10px] font-medium">Registrar</span>
            </a>
          </Link>
          <Link href="/search">
            <a className={cn("flex flex-col items-center gap-1 p-2 rounded-lg transition-colors", location === '/search' ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
              <Search className="h-6 w-6" />
              <span className="text-[10px] font-medium">Buscar</span>
            </a>
          </Link>
        </div>
      </nav>
    </div>
  );
}
