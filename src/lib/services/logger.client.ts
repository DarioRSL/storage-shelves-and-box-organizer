/* eslint-disable no-console */
/**
 * Client-side logger that uses browser console
 * This file is used in React components running in the browser
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
 * Client-side logger methods
 */
export const log = {
  error: (message: string, meta?: LogMetadata) => {
    if (meta && Object.keys(meta).length > 0) {
      console.error(message, meta);
    } else {
      console.error(message);
    }
  },
  warn: (message: string, meta?: LogMetadata) => {
    if (meta && Object.keys(meta).length > 0) {
      console.warn(message, meta);
    } else {
      console.warn(message);
    }
  },
  info: (message: string, meta?: LogMetadata) => {
    if (meta && Object.keys(meta).length > 0) {
      console.log(message, meta);
    } else {
      console.log(message);
    }
  },
  debug: (message: string, meta?: LogMetadata) => {
    if (meta && Object.keys(meta).length > 0) {
      console.debug(message, meta);
    } else {
      console.debug(message);
    }
  },
};
