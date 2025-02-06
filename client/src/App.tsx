import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from "./lib/auth";
import NotFound from "@/pages/not-found";
import Calendar from "@/pages/calendar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Calendar} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;