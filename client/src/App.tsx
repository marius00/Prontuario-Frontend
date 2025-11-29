import React, { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { AppProvider, useApp } from "./lib/store";
import { Layout } from "./components/Layout";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";

// Pages
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import RegisterPage from "@/pages/RegisterPage";
import SearchPage from "@/pages/SearchPage";
import AdminPage from "@/pages/AdminPage";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { currentUser, isInitialized } = useApp();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isInitialized && !currentUser) {
      setLocation("/login");
    }
  }, [currentUser, isInitialized, setLocation]);

  if (!isInitialized) return null;
  if (!currentUser) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function LoginRouteWrapper() {
  const { currentUser, isInitialized } = useApp();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isInitialized && currentUser) {
      // Already logged in: skip rendering LoginPage and go to dashboard
      setLocation("/");
    }
  }, [currentUser, isInitialized, setLocation]);

  if (!isInitialized) return null;
  if (currentUser) return null;
  return <LoginPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginRouteWrapper} />
      <Route path="/">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/register">
        <ProtectedRoute component={RegisterPage} />
      </Route>
      <Route path="/search">
        <ProtectedRoute component={SearchPage} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminPage} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AppProvider>
      <Router />
      <Toaster />
    </AppProvider>
  );
}

export default App;
