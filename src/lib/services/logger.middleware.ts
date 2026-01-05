import { defineMiddleware } from "astro:middleware";
import { createContextLogger } from "./logger";
import { randomUUID } from "node:crypto";

/**
 * Request/Response logging middleware
 * Logs all incoming requests with timing, user context, and response status
 */
export const loggerMiddleware = defineMiddleware(async (context, next) => {
  const requestId = randomUUID();
  const startTime = Date.now();

  const method = context.request.method;
  const path = context.url.pathname;
  const userAgent = context.request.headers.get("user-agent") || "unknown";

  const requestLogger = createContextLogger({ requestId });

  // Log incoming request
  requestLogger.info("Incoming request", {
    method,
    path,
    userAgent,
  });

  try {
    const response = await next();
    const duration = Date.now() - startTime;
    const userId = context.locals.user?.id;
    const statusCode = response.status;

    // Log level based on status code
    const logLevel = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

    requestLogger[logLevel]("Request completed", {
      method,
      path,
      statusCode,
      duration,
      userId,
    });

    // Inject request ID for debugging
    response.headers.set("X-Request-ID", requestId);

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    requestLogger.error("Request failed with exception", {
      method,
      path,
      duration,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    throw error;
  }
});
