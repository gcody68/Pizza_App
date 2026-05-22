import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Env vars are preferred; hardcoded values are safe public fallbacks for
// Vercel preview deployments where env vars may not be configured.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://dgogwezhlhbcyazwpfwe.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnb2d3ZXpobGhiY3lhendwZndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzk3NDcsImV4cCI6MjA5NDYxNTc0N30.L1onvKbbtxoKRyzcINdPU_KasXdsuNgBkctQocvqmi0";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
});
