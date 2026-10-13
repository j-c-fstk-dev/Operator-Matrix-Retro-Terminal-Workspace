import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || (typeof process !== 'undefined' ? process.env : {}) || {};
const supabaseUrl = (env.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '').trim();

// Check if credentials are valid and not placeholders
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
}
