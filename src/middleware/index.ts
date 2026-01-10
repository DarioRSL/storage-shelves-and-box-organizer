import { defineMiddleware, sequence } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import { parse } from "cookie";
import type { Database } from "../db/database.types.ts";
import { loggerMiddleware } from "@/lib/services/logger.middleware";

const authMiddleware = defineMiddleware(async (context, next) => {
  // Parse cookies from request headers
  const cookieString = context.request.headers.get("cookie") || "";
  const cookies = parse(cookieString);

  // Get JWT from custom session cookie
  const sessionToken = cookies.sb_session;

  // Store cookies to set in response later
  const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  // Create Supabase client
  const supabase = createServerClient<Database>(
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

  // Get authenticated user and set session for RLS policies
  let user = null;

  if (sessionToken) {
    try {
      // Set session with JWT token - this enables auth.uid() in RLS policies
      await supabase.auth.setSession({
        access_token: sessionToken,
        refresh_token: sessionToken, // Use same token as fallback
      });

      // Verify session by getting user
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        user = data.user;
      }
    } catch {
      // Continue without user
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
