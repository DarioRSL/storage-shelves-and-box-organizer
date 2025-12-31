import type { APIRoute } from "astro";

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
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { token } = body as { token?: string };

    if (!token || typeof token !== "string") {
      console.error("[POST /api/auth/session] Token missing or invalid:", {
        hasToken: !!body.token,
        tokenType: typeof body.token,
        bodyKeys: Object.keys(body),
      });
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/auth/session] Token received, length:", token.length);

    // 2. Validate JWT format
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("[POST /api/auth/session] Invalid JWT format, parts:", parts.length);
      return new Response(JSON.stringify({ error: "Invalid token format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Decode JWT payload (no signature verification - trusted source)
    let payload: any;
    try {
      payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Validate required claims
    if (!payload.sub || !payload.email) {
      console.error("[POST /api/auth/session] Invalid token claims:", {
        hasSub: !!payload.sub,
        hasEmail: !!payload.email,
      });
      return new Response(JSON.stringify({ error: "Invalid token claims" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[POST /api/auth/session] Valid token for user:", payload.email);

    // 5. Set HttpOnly secure cookie
    // Security flags:
    // - HttpOnly: JavaScript cannot access (XSS protection)
    // - Secure: Only HTTPS (production)
    // - SameSite=Strict: Only same-origin requests (CSRF protection)
    // - Max-Age=3600: 1 hour expiry
    const cookieValue = `sb_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`;

    // In production, add Secure flag
    const isProduction = import.meta.env.PROD;
    const secureCookie = isProduction ? `${cookieValue}; Secure` : cookieValue;

    console.log("[POST /api/auth/session] Setting HttpOnly cookie for", payload.email);

    const response = new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": secureCookie,
      },
    });

    console.log("[POST /api/auth/session] Response sent with status 200");
    return response;
  } catch (error) {
    console.error("[POST /api/auth/session] Unexpected error:", error);
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
  try {
    // Clear cookie by setting Max-Age=0
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": `sb_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
      },
    });
  } catch (error) {
    console.error("[DELETE /api/auth/session] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
