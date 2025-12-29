import { parse } from "cookie";

/**
 * Extracts and decodes user ID from sb_session cookie
 * Used in API endpoints to authenticate requests based on HttpOnly session cookie
 *
 * @param request - Astro request object
 * @returns User ID if valid session exists, null otherwise
 */
export function extractUserIdFromSession(request: Request): string | null {
  try {
    const cookieString = request.headers.get("cookie") || "";
    const cookies = parse(cookieString);
    const sessionToken = cookies.sb_session;

    if (!sessionToken) {
      return null;
    }

    // Decode JWT from session token
    const parts = sessionToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64").toString("utf-8")
    ) as { sub?: string };

    if (!payload.sub) {
      throw new Error("Invalid token claims");
    }

    return payload.sub;
  } catch (err) {
    console.error("[extractUserIdFromSession] Error:", err);
    return null;
  }
}
