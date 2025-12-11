'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Role = 'student' | 'mentor' | 'university';

interface User {
  id?: string;
  email: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: Role) => {
    setIsLoading(true);
    try {
      // Call backend login API
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const userData: User = {
        id: data.id,  // MongoDB user ID from backend
        email: data.email || email,
        role: data.role || role,
      };

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

