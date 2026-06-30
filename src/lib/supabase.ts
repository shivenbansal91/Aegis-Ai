import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,       // refresh JWT before it expires
    persistSession: true,          // save session to localStorage
    detectSessionInUrl: true,      // pick up token from OAuth redirect URL hash
  },
});

export const isSupabaseConfigured =
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder';
