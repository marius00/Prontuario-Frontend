import React, { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { AppProvider, useApp } from "@/lib/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/Layout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import SearchPage from "@/pages/SearchPage";
import AdminPage from "@/pages/AdminPage";
import NotFound from "@/pages/not-found";
import { Toaster } from "@/components/ui/toaster";
import { registerServiceWorker } from "@/lib/pushNotifications";
import "./index.css";

const queryClient = new QueryClient();

// Authentication guard component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, isInitialized } = useApp();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isInitialized && !currentUser) {
      setLocation("/login");
    }
  }, [currentUser, isInitialized, setLocation]);

  // Show loading while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!currentUser) {
    return null;
  }

  return <>{children}</>;
}

// Main app routes component
function AppRoutes() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register">
        <AuthGuard>
          <Layout>
            <RegisterPage />
          </Layout>
        </AuthGuard>
      </Route>
      <Route path="/search">
        <AuthGuard>
          <Layout>
            <SearchPage />
          </Layout>
        </AuthGuard>
      </Route>
      <Route path="/admin">
        <AuthGuard>
          <Layout>
            <AdminPage />
          </Layout>
        </AuthGuard>
      </Route>
      <Route path="/">
        <AuthGuard>
          <Layout>
            <DashboardPage />
          </Layout>
        </AuthGuard>
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  // Early service worker registration for PWA functionality
  useEffect(() => {
    // Only register the service worker, don't set up push notifications yet
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log("Service Worker registered early:", registration.scope);
        })
        .catch((error) => {
          console.error("Early service worker registration failed:", error);
        });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AppRoutes />
        <Toaster />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
