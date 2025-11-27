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

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { currentUser } = useApp();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!currentUser) {
      setLocation("/login");
    }
  }, [currentUser, setLocation]);

  if (!currentUser) return null;

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <ProtectedRoute component={DashboardPage} />
      </Route>
      <Route path="/register">
        <ProtectedRoute component={RegisterPage} />
      </Route>
      <Route path="/search">
        <ProtectedRoute component={SearchPage} />
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
