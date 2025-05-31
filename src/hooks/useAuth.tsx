// src/hooks/useAuth.ts
import { useState, useEffect, useContext, createContext, ReactNode, JSX } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { loginSchema } from '../utils/validation';
import { z } from 'zod';
import { useErrorHandling } from './useErrorHandling';
import { triggerOnboarding } from '../services/n8nWebhooks';

// Define signup schema since it's missing
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (data: z.infer<typeof loginSchema>) => Promise<{ user: User | null; error: Error | null }>;
  signUp: (data: { 
    email: string; 
    password: string;
    user_metadata?: {
      name: string;
      phone_number: string;
    };
    context?: {
      platform: string;
      source: string;
    };
  }) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  isAuthReady: boolean;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = ({ children }: AuthProviderProps): JSX.Element => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const { handleError } = useErrorHandling();

  useEffect(() => {
    console.log('AuthProvider useEffect triggered.');

    // Get initial session first
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', session);
        if (error) throw error;
        setSession(session);
        setUser(session?.user || null);
      } catch (error) {
        console.error('Failed to get initial session:', error);
        handleError(error, 'Failed to get initial session.');
        setUser(null);
        setSession(null);
      } finally {
        setIsLoading(false);
        setIsAuthReady(true);
        console.log('isAuthReady set to true after initial session check.');
      }
    };

    getInitialSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user || null);
        setIsLoading(false);
        
        if (!isAuthReady) {
          setIsAuthReady(true);
          console.log('isAuthReady set to true via auth state change.');
        }
      }
    );

    return () => {
      console.log('Auth listener cleanup.');
      subscription?.unsubscribe();
    };
  }, [handleError, isAuthReady]);

  const signIn = async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      
      if (error) throw error;
      
      console.log('Sign in successful:', authData.user);
      return { user: authData.user, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      handleError(error);
      return { user: null, error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (data: { 
    email: string; 
    password: string;
    user_metadata?: {
      name: string;
      phone_number: string;
    };
    context?: {
      platform: string;
      source: string;
    };
  }) => {
    setIsLoading(true);
    try {
      console.log('Attempting sign up with:', {
        email: data.email,
        hasMetadata: !!data.user_metadata,
        metadataKeys: data.user_metadata ? Object.keys(data.user_metadata) : [],
        context: data.context
      });
      
      const userMetadata = data.user_metadata ? {
        ...data.user_metadata,
        full_name: data.user_metadata.name
      } : {};
      
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: userMetadata
        }
      });
      
      if (error) {
        console.error('Supabase sign up error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }

      console.log('Sign up response:', {
        user: authData.user ? {
          id: authData.user.id,
          email: authData.user.email,
          metadata: authData.user.user_metadata
        } : null,
        session: authData.session ? 'Session created' : 'No session'
      });

      if (authData.user) {
        console.log('User created successfully:', authData.user.id);
        
        // Trigger onboarding workflow
        try {
          await triggerOnboarding({
            user_id: authData.user.id,
            created_at: new Date().toISOString(),
            context: data.context || {
              platform: 'web',
              source: 'signup'
            }
          });
          console.log('Onboarding workflow triggered');
        } catch (onboardingError) {
          console.error('Failed to trigger onboarding:', onboardingError);
          // Don't fail the signup if onboarding fails
        }
      }

      return { user: authData.user, error: null };
    } catch (error: any) {
      console.error('Sign up error details:', {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });
      handleError(error);
      return { user: null, error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local state
      setSession(null);
      setUser(null);
      
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      handleError(error);
      return { error: error as Error };
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    session,
    user,
    isLoading,
    signIn,
    signUp,
    signOut,
    isAuthReady,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    console.warn('useAuth must be used within an AuthProvider - check your component hierarchy');
    return {
      session: null,
      user: null,
      isLoading: false,
      signIn: async () => ({ user: null, error: new Error('Auth not initialized') }),
      signUp: async () => ({ user: null, error: new Error('Auth not initialized') }),
      signOut: async () => ({ error: new Error('Auth not initialized') }),
      isAuthReady: false
    };
  }
  return context;
};

export { AuthProvider, useAuth, signupSchema };
