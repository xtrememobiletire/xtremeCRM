import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '../utils/api';

export interface User {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  role: string;
  countryCode: 'CA' | 'US' | 'UK';
  phone?: string | null;
  isAgentActive?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('xtreme_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success && res.data.data) {
          const u = res.data.data;
          const formattedUser = {
            ...u,
            firstName: u.firstName || u.fullName?.split(' ')[0] || 'User',
          };
          setUser(formattedUser);
          localStorage.setItem('xtreme_user', JSON.stringify(formattedUser));
        }
      } catch {
        // If unauthenticated or token expired, clear invalid storage
        if (!localStorage.getItem('xtreme_token')) {
          setUser(null);
          localStorage.removeItem('xtreme_user');
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success && res.data.data) {
      const { user: u, token } = res.data.data;
      if (token) {
        localStorage.setItem('xtreme_token', token);
      }
      const formattedUser = {
        ...u,
        firstName: u.firstName || u.fullName?.split(' ')[0] || 'User',
      };
      setUser(formattedUser);
      localStorage.setItem('xtreme_user', JSON.stringify(formattedUser));
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setUser(null);
    localStorage.removeItem('xtreme_user');
    localStorage.removeItem('xtreme_token');
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...data };
      localStorage.setItem('xtreme_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
