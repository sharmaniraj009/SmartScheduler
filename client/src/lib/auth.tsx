import { createContext, useContext, useEffect, useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './queryClient';

interface User {
  id: number;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['/api/auth/session'],
    retry: false,
  });

  useEffect(() => {
    if (session) {
      setUser(session.user);
    }
  }, [session]);

  const login = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        const result = await apiRequest('POST', '/api/auth/google', {
          access_token: response.access_token,
        });
        const data = await result.json();
        setUser(data.user);
      } catch (error) {
        console.error('Login failed:', error);
      }
    },
    scope: 'https://www.googleapis.com/auth/calendar',
  });

  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
