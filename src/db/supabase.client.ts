import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient as SupabaseClientBase } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

// Support both build-time (import.meta.env) and runtime (process.env) environment variables
// This is necessary for Docker/Node.js deployments where env vars are injected at runtime
const supabaseUrl = import.meta.env.SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.SUPABASE_KEY || process.env.SUPABASE_KEY || "";

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Export typed Supabase client for use in services and API routes
export type SupabaseClient = SupabaseClientBase<Database>;
