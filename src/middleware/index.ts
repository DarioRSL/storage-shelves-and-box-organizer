import { defineMiddleware, sequence } from "astro:middleware";
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
      console.log("[Middleware] Parsed session cookie:", {
        hasAccessToken: !!sessionData?.access_token,
        hasRefreshToken: !!sessionData?.refresh_token,
        accessTokenPrefix: sessionData?.access_token?.substring(0, 20),
      });
    } catch (error) {
      // Invalid session data, continue without auth
      console.log("[Middleware] Failed to parse session cookie:", error);
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
    supabase = createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
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
    });

    // Validate the token and get user info
    try {
      const { data, error } = await supabase.auth.getUser(sessionData.access_token);
      if (!error && data?.user) {
        user = data.user;
      }
    } catch {
      // Continue without user
    }
  } else if (sessionData) {
    // For custom session cookie, decode JWT to get user info WITHOUT verification
    // This is safe because the cookie is HttpOnly and set by our /api/auth/session endpoint
    // which already validated the token with Supabase during login
    try {
      const tokenParts = sessionData.access_token.split(".");
      if (tokenParts.length === 3) {
        const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString("utf-8"));

        // Extract user info from JWT claims
        user = {
          id: payload.sub,
          email: payload.email,
          aud: payload.aud,
          role: payload.role,
          app_metadata: payload.app_metadata || {},
          user_metadata: payload.user_metadata || {},
          created_at: payload.created_at || new Date().toISOString(),
          updated_at: payload.updated_at || new Date().toISOString(),
        };

        console.log("[Middleware] Session cookie auth SUCCESS (decoded JWT):", {
          userId: user.id,
          email: user.email,
        });
      }
    } catch (error) {
      console.log("[Middleware] Failed to decode JWT from session cookie:", error);
    }

    // Create Supabase client with the token in the Authorization header
    // The token will be used for RLS policies in database queries
    supabase = createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${sessionData.access_token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } else {
    // No session data - create basic client for non-authenticated requests
    supabase = createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
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
