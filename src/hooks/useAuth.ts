import { useState, useEffect, createContext, useContext } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  onboardingComplete: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  onboardingComplete: true, // default true to avoid flash-redirect
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(true);

  useEffect(() => {
    // Step 1: Listen for auth changes FIRST (catches OAuth redirect token in URL)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Step 2: Verify token server-side with getUser() — not just local cache
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (error || !user) {
        // Token is invalid or expired — clear everything
        setUser(null);
        setSession(null);
        setProfile(null);
        setLoading(false);
        // Sign out silently to clear stale localStorage session
        supabase.auth.signOut().catch(() => {});
      }
      // If valid, onAuthStateChange will handle setting state
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch error:', error.message);
      }

      setProfile(data as Profile | null);
      // NULL = existing user (column just added), treat as complete
      // false = new user who explicitly hasn't completed onboarding
      const ob = (data as any)?.onboarding_complete;
      setOnboardingComplete(ob === null || ob === undefined ? true : ob);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  return { user, session, profile, loading, onboardingComplete };
}
