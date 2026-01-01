import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: any }>;
  signUp: (phone: string, password: string, name: string, phoneNumber: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const phoneToEmail = (phone: string): string => {
  const cleanPhone = phone.replace(/\+/g, '');
  return `${cleanPhone}@phone.kz`;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (phone: string, password: string) => {
    const email = phoneToEmail(phone);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (phone: string, password: string, name: string, phoneNumber: string) => {
    const email = phoneToEmail(phone);

    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('phone')
      .eq('phone', phone)
      .maybeSingle();

    if (existingProfile) {
      return { error: { message: 'Phone number already registered' } };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: phoneNumber,
        },
      },
    });

    if (!error && data.user) {
      await supabase.from('user_profiles').insert([
        {
          user_id: data.user.id,
          name,
          phone: phoneNumber,
          email,
        },
      ]);
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
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
