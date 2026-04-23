// @ts-nocheck
import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  signingOut: boolean;
  setSigningOut: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  adminLoading: true,
  signingOut: false,
  setSigningOut: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [signingOut, setSigningOutState] = useState(false);
  const signingOutRef = useRef(false);

  const setSigningOut = (value: boolean) => {
    signingOutRef.current = value;
    setSigningOutState(value);
  };

  const checkAdminStatus = async (userId: string) => {
    try {
      console.log('Checking admin status for user:', userId);
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });
      console.log('Admin check result:', { data, error });
      setIsAdmin(data || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let lastUserId: string | null = null;
    
    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      lastUserId = session?.user?.id ?? null;
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          if (mounted) checkAdminStatus(session.user.id);
        }, 0);
      } else {
        setAdminLoading(false);
      }
      
      setLoading(false);
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted || signingOutRef.current) return;

        // Ignore token refreshes and re-fired initial sessions when the user
        // hasn't actually changed (e.g. tab regains focus). These would
        // otherwise toggle adminLoading and cause routes to remount.
        const newUserId = session?.user?.id ?? null;
        if (
          (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'SIGNED_IN') &&
          newUserId === lastUserId
        ) {
          setSession(session);
          return;
        }
        lastUserId = newUserId;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setAdminLoading(true);
          setTimeout(() => {
            if (mounted) checkAdminStatus(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setAdminLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, adminLoading, signingOut, setSigningOut }}>
      {children}
    </AuthContext.Provider>
  );
};