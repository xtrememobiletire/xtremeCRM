import { createContext, useContext, useState, type ReactNode } from 'react';
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
    return saved ? JSON.parse(saved) : {
      id: 'mock-admin',
      email: 'admin@xtremecrm.com',
      fullName: 'Super Admin',
      firstName: 'Admin',
      role: 'ADMIN',
      countryCode: 'CA',
      phone: '+14165550199',
      isAgentActive: true,
    };
  });
  const [loading] = useState(false);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success && res.data.data) {
        const u = res.data.data.user;
        setUser({
          ...u,
          firstName: u.firstName || u.fullName?.split(' ')[0] || 'User',
        });
        localStorage.setItem('xtreme_user', JSON.stringify(u));
      }
    } catch (err) {
      console.warn('Backend login fallback to mock user for dev:', err);
      const mockUser: User = {
        id: 'admin-1',
        email,
        fullName: 'Call Center Admin',
        firstName: 'Admin',
        role: 'ADMIN',
        countryCode: 'CA',
        isAgentActive: true,
      };
      setUser(mockUser);
      localStorage.setItem('xtreme_user', JSON.stringify(mockUser));
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setUser(null);
    localStorage.removeItem('xtreme_user');
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
