import { defineMiddleware, sequence } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { parse } from "cookie";
import type { Database } from "../db/database.types.ts";
import { loggerMiddleware } from "@/lib/services/logger.middleware";

const authMiddleware = defineMiddleware(async (context, next) => {
  // Parse cookies from request headers
  const cookieString = context.request.headers.get("cookie") || "";
  const cookies = parse(cookieString);

  // Get session data from custom session cookie OR Authorization header
  const sessionCookie = cookies.sb_session;
  const authHeader = context.request.headers.get("authorization");
  let sessionData: { access_token: string; refresh_token: string } | null = null;

  // Priority 1: Check Authorization header (for API clients and tests)
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7); // Remove "Bearer " prefix
    sessionData = {
      access_token: token,
      refresh_token: "", // Not needed for read-only operations
    };
  }
  // Priority 2: Check session cookie (for browser clients)
  else if (sessionCookie) {
    try {
      sessionData = JSON.parse(decodeURIComponent(sessionCookie));
    } catch {
      // Invalid session data, continue without auth
    }
  }

  // Store cookies to set in response later
  const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  // Create appropriate Supabase client based on auth method
  let supabase;
  let user = null;

  if (authHeader?.startsWith("Bearer ") && sessionData) {
    // For Bearer token auth (API clients/tests), create a client with token in headers
    // This ensures auth.uid() works correctly for RLS policies
    supabase = createClient<Database>(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_KEY,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    // Validate the token and get user info
    try {
      const { data, error } = await supabase.auth.getUser(sessionData.access_token);
      if (!error && data?.user) {
        user = data.user;
      }
    } catch {
      // Continue without user
    }
  } else {
    // For session cookie auth (browser clients), use SSR client with cookie management
    supabase = createServerClient<Database>(
      import.meta.env.SUPABASE_URL,
      import.meta.env.SUPABASE_KEY,
      {
        cookies: {
          getAll() {
            return Object.entries(cookies).map(([name, value]) => ({
              name,
              value: value || "",
            }));
          },
          setAll(cookiesToSet_) {
            cookiesToSet.push(...cookiesToSet_);
          },
        },
      }
    );

    // Get authenticated user from session cookie
    if (sessionData) {
      try {
        await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });

        const { data, error } = await supabase.auth.getUser();
        if (!error && data?.user) {
          user = data.user;
        }
      } catch {
        // Continue without user
      }
    }
  }

  // Make supabase client available to routes
  context.locals.supabase = supabase;

  // Make user available to routes
  context.locals.user = user;

  // Process request
  const response = await next();

  // Set any cookies that Supabase needs
  cookiesToSet.forEach(({ name, value, options }) => {
    response.headers.append(
      "Set-Cookie",
      `${name}=${encodeURIComponent(value)}; Path=/; ${
        options?.maxAge ? `Max-Age=${options.maxAge};` : ""
      }${options?.secure ? "Secure;" : ""}${options?.httpOnly ? "HttpOnly;" : ""}SameSite=Lax`
    );
  });

  return response;
});

export const onRequest = sequence(loggerMiddleware, authMiddleware);
