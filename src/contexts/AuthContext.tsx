import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { pb } from '@/integrations/pocketbase/client';
import { AuthModel } from 'pocketbase';

type UserRole = 'admin' | 'operator' | null;

interface AuthContextType {
  user: AuthModel | null;
  userRole: UserRole;
  loading: boolean;
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  refreshMustChangePassword: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthModel | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    // Initial state
    setUser(pb.authStore.model);
    setUserRole(pb.authStore.model?.role || null);
    setMustChangePassword(pb.authStore.model?.must_change_password || false);
    setLoading(false);

    // Auth state listener
    const unsubscribe = pb.authStore.onChange((token, model) => {
      setUser(model);
      setUserRole(model?.role || null);
      setMustChangePassword(model?.must_change_password || false);
    });

    return () => unsubscribe();
  }, []);

  const refreshMustChangePassword = async () => {
    if (user?.id) {
      const record = await pb.collection('users').getOne(user.id);
      setMustChangePassword(record.must_change_password || false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: fullName,
        role: 'operator',
      });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email);
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    pb.authStore.clear();
    setUser(null);
    setUserRole(null);
    setMustChangePassword(false);
  };

  const value = {
    user,
    userRole,
    loading,
    mustChangePassword,
    signIn,
    signUp,
    requestPasswordReset,
    signOut,
    isAdmin: userRole === 'admin',
    refreshMustChangePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
