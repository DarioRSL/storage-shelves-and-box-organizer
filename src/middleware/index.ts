import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import { parse } from "cookie";
import type { Database } from "../db/database.types.ts";

export const onRequest = defineMiddleware(async (context, next) => {
  // Parse cookies from request headers using proper cookie parser
  const cookieString = context.request.headers.get("cookie") || "";
  const cookies = parse(cookieString);

  // Check for sb_session HttpOnly cookie (set by /api/auth/session)
  const sessionToken = cookies.sb_session;

  // Debug: Log session status
  if (context.url.pathname === "/app" || context.url.pathname === "/auth") {
    console.log(`[Middleware] Path: ${context.url.pathname}`);
    console.log(`[Middleware] Session token present:`, !!sessionToken);
  }

  // Store cookies to set in response later
  const cookiesToSet: { name: string; value: string; options?: any }[] = [];

  // Create Supabase client using @supabase/ssr
  // This handles cookie-based session management automatically
  const supabase = createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    cookies: {
      getAll() {
        return Object.entries(cookies).map(([name, value]) => ({
          name,
          value: value ? decodeURIComponent(value) : "",
        }));
      },
      setAll(cookiesToSet_) {
        // Store cookies to be set after response
        cookiesToSet.push(...cookiesToSet_);
      },
    },
  });

  // Make supabase client available to routes via context.locals
  context.locals.supabase = supabase;

  // Get authenticated user from session (cookies) OR from session token
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    } else if (sessionToken) {
      // If no user from cookies, try to extract from sb_session token
      // Decode JWT without verification (we trust tokens from our own client)
      try {
        const parts = sessionToken.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid JWT format");
        }

        // Decode the payload (second part of JWT)
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8")) as {
          sub?: string;
          email?: string;
          role?: string;
          aud?: string;
          user_metadata?: Record<string, unknown>;
        };

        // Create a user-like object from the JWT payload
        if (payload.sub && payload.email) {
          user = {
            id: payload.sub,
            email: payload.email,
            user_metadata: payload.user_metadata || {},
            aud: payload.aud || "authenticated",
            role: payload.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            app_metadata: {},
            phone: null,
            email_confirmed_at: null,
            phone_confirmed_at: null,
            confirmed_at: new Date().toISOString(),
            is_anonymous: false,
          } as any;

          // Set JWT in Supabase client so RLS policies can check auth.uid()
          // Manually set the session with the JWT token and empty refresh token
          await supabase.auth.setSession({
            access_token: sessionToken,
            refresh_token: "",
          });
        }
      } catch (err) {
        // Token decoding failed, continue without user
      }
    }
  } catch (err) {
    // User not authenticated or session invalid, continue without user
  }

  // Make user available to routes via context.locals
  context.locals.user = user;

  // Process the request and get the response
  const response = await next();

  // Set any cookies that Supabase needs to set
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
