import { createClient } from "@supabase/supabase-js";

// Retrieve environment variables securely, checking both standard Next.js (client) and Express (process.env) formats
const supabaseUrl = 
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined) || 
  ((import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_URL : "") || 
  "";

const supabaseAnonKey = 
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) || 
  ((import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_ANON_KEY : "") || 
  "";

// Initialize Supabase Client with graceful fallback for dev sandbox environment
export const supabase = createClient(
  supabaseUrl || "https://placeholder-project.supabase.co", 
  supabaseAnonKey || "placeholder-anon-key"
);

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === "string" && 
    supabaseUrl.trim().length > 0 && 
    supabaseUrl !== "https://placeholder-project.supabase.co" &&
    typeof supabaseAnonKey === "string" &&
    supabaseAnonKey.trim().length > 0 &&
    supabaseAnonKey !== "placeholder-anon-key"
  );
};
