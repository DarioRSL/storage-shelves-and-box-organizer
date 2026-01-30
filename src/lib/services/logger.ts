/**
 * Server-side logger using Winston
 * DO NOT import this file in client-side React components!
 * Use logger.client.ts instead for browser-side logging
 */
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// Environment-specific configuration
const LOG_LEVEL = import.meta.env.LOG_LEVEL || (import.meta.env.PROD ? "info" : "debug");
const IS_DEV = !import.meta.env.PROD;
// Detect serverless environment (Vercel, AWS Lambda, etc.) - filesystem is read-only
const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// JSON format for production
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Pretty format for development
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }
    return msg;
  })
);

// Winston transports
const transports: winston.transport[] = [];

// Console transport (dev or serverless)
if (IS_DEV || IS_SERVERLESS) {
  transports.push(
    new winston.transports.Console({
      format: IS_SERVERLESS ? jsonFormat : devFormat,
    })
  );
}

// File transports (only for non-serverless environments with writable filesystem)
if (!IS_SERVERLESS) {
  transports.push(
    new DailyRotateFile({
      filename: "logs/combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      format: jsonFormat,
    })
  );

  transports.push(
    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
      format: jsonFormat,
    })
  );
}

// Create Winston logger
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports,
  exitOnError: false,
});

/**
 * Metadata types for structured logging
 */
export interface LogMetadata {
  userId?: string;
  workspaceId?: string;
  boxId?: string;
  locationId?: string;
  qrCodeId?: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Sanitizes metadata to remove/mask sensitive information
 */
export function sanitizeMetadata(meta?: LogMetadata): LogMetadata | undefined {
  if (!meta) return undefined;

  const sanitized = { ...meta };
  const keysToMask = ["password", "token", "api_key", "apikey", "secret", "jwt", "access_token", "refresh_token"];

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (keysToMask.some((k) => lowerKey.includes(k))) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return sanitized;
}

/**
 * Type-safe logger methods (server-side only)
 */
export const log = {
  error: (message: string, meta?: LogMetadata) => logger.error(message, sanitizeMetadata(meta)),
  warn: (message: string, meta?: LogMetadata) => logger.warn(message, sanitizeMetadata(meta)),
  info: (message: string, meta?: LogMetadata) => logger.info(message, sanitizeMetadata(meta)),
  debug: (message: string, meta?: LogMetadata) => logger.debug(message, sanitizeMetadata(meta)),
};

/**
 * Creates a child logger with persistent context
 */
export function createContextLogger(context: LogMetadata) {
  return {
    error: (message: string, meta?: LogMetadata) => log.error(message, { ...context, ...meta }),
    warn: (message: string, meta?: LogMetadata) => log.warn(message, { ...context, ...meta }),
    info: (message: string, meta?: LogMetadata) => log.info(message, { ...context, ...meta }),
    debug: (message: string, meta?: LogMetadata) => log.debug(message, { ...context, ...meta }),
  };
}

/**
 * Masks JWT tokens (show only header + first 10 chars of payload)
 */
export function maskJWT(token: string): string {
  if (!token || token.length < 20) return "[REDACTED]";
  const parts = token.split(".");
  if (parts.length !== 3) return "[REDACTED]";
  return `${parts[0]}.${parts[1].substring(0, 10)}...[REDACTED]`;
}
