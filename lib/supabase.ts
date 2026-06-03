/**
 * ─────────────────────────────────────────────────────────────
 * HAMZA AGENCY — Supabase Client
 * ─────────────────────────────────────────────────────────────
 * Two client exports:
 *  1. supabase      → browser/client-side (uses anon key)
 *  2. supabaseAdmin → server-side only (uses service role key)
 *
 * Usage:
 *   import { supabase } from "@/lib/supabase";
 *   const { data, error } = await supabase.from("table").select("*");
 * ─────────────────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";

// ─── Environment validation ──────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL. " +
      "Add it to your .env.local file."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "[Supabase] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Add it to your .env.local file."
  );
}

// ─── Browser / Client-side Supabase ─────────────────────────
// Safe to use in React components and client-side code.
// Protected by Row Level Security (RLS) policies.

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage for web
    persistSession: true,
    // Auto-refresh the JWT before it expires
    autoRefreshToken: true,
    // Detect session from URL (OAuth callbacks)
    detectSessionInUrl: true,
  },
});

// ─── Server-side Admin Supabase ─────────────────────────────
// WARNING: Only use in Server Components, API Routes, or Server Actions.
// NEVER import this in client components — it exposes the service role key.

export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "[Supabase Admin] Missing SUPABASE_SERVICE_ROLE_KEY. " +
        "This is required for server-side admin operations."
    );
  }

  return createClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      // Admin client should not persist sessions
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// ─── Type helpers (extend in Phase 2 with generated types) ──

export type SupabaseClient = typeof supabase;
