import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types.ts";

export const onRequest = defineMiddleware(async (context, next) => {
  // Extract auth token from Authorization header
  const authHeader = context.request.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  // Create a Supabase client with the auth token
  // Using global.headers option to pass the Authorization header to all requests
  const supabase = createClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_KEY, {
    global: {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
  });

  // Make supabase client available to API routes via context.locals
  context.locals.supabase = supabase;

  // Try to get the authenticated user from the token
  let user = null;
  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        user = data.user;
      }
    } catch (err) {
      // Token may be invalid or expired, continue without user
    }
  }

  // Make user available to API routes via context.locals
  context.locals.user = user;

  return next();
});
