// src/utils/errorHandling.ts
// This file provides utility functions for consistent error handling across the application.
// It helps in standardizing error messages and logging.

/**
 * Parses an unknown error object and returns a user-friendly message.
 * This function attempts to extract a meaningful message from various error types.
 * @param error - The error object, which can be of any type (Error, string, object).
 * @returns A string representing the error message.
 */
export const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      // If it's a standard Error object, return its message
      return error.message;
    }
    if (typeof error === 'string') {
      // If it's a string, return it directly
      return error;
    }
    if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as any).message === 'string') {
      // If it's an object with a 'message' property, return that message
      return (error as any).message;
    }
    // Fallback for unexpected error types
    return 'An unexpected error occurred.';
  };
  
  /**
   * Logs an error to the console with additional context.
   * In a production environment, this could also send errors to a logging service
   * like Sentry, LogRocket, or a custom backend logging endpoint.
   * @param error - The error object to log.
   * @param context - Optional additional context about where the error occurred.
   */
  export const logError = (error: unknown, context?: string): void => {
    const errorMessage = getErrorMessage(error);
    if (context) {
      console.error(`[App Error] ${context}:`, errorMessage, error);
    } else {
      console.error('[App Error]:', errorMessage, error);
    }
  
    // In a real application, you might send this to an error tracking service:
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, { extra: { context } });
    // }
  };
  
  /**
   * A type guard to check if an unknown value is an Error instance.
   * @param error - The value to check.
   * @returns True if the value is an Error instance, false otherwise.
   */
  export const isError = (error: unknown): error is Error => {
    return error instanceof Error;
  };
  