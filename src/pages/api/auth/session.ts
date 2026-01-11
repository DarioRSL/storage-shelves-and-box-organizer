import type { APIRoute } from "astro";
import { log } from "../../../lib/services/logger";

export const prerender = false;

/**
 * POST /api/auth/session
 * Establishes a server-side session using HttpOnly cookie
 * Called by client after successful Supabase login
 * Security: Token passed in body (not URL), stored in HttpOnly cookie
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { token, refreshToken } = body as { token?: string; refreshToken?: string };

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!refreshToken || typeof refreshToken !== "string") {
      return new Response(JSON.stringify({ error: "Refresh token required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Validate JWT format (access token)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: "Invalid token format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Decode JWT payload to validate
    let payload: unknown;
    try {
      payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!payload || typeof payload !== "object" || !("sub" in payload)) {
      return new Response(JSON.stringify({ error: "Invalid token claims" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Create session object with both tokens
    const sessionData = JSON.stringify({ access_token: token, refresh_token: refreshToken });

    // 5. Set HttpOnly cookie with session data
    const isProduction = import.meta.env.PROD;
    const cookieParts = [
      `sb_session=${encodeURIComponent(sessionData)}`, // Store both tokens as JSON
      "Path=/",
      "HttpOnly",
      "SameSite=Strict",
      "Max-Age=3600",
    ];

    if (isProduction) {
      cookieParts.push("Secure");
    }

    log.info("Session created successfully", {
      endpoint: "POST /api/auth/session",
      userId: payload.sub as string,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieParts.join("; "),
      },
    });
  } catch (error) {
    log.error("Session creation failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/auth/session
 * Clears the session cookie (logout)
 */
export const DELETE: APIRoute = async () => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "sb_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
    },
  });
};
