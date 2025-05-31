// src/hooks/useErrorHandling.ts
// This custom hook provides a centralized way to handle errors and display
// user-friendly toast notifications using Chakra UI's useToast hook.
// It leverages the getErrorMessage utility for consistent error parsing.

import { useToast, UseToastOptions } from '@chakra-ui/react';
import { useCallback } from 'react';
import { getErrorMessage, logError } from '../utils/errorHandling';
import { DEFAULT_TOAST_DURATION } from '../utils/constants';

export const useErrorHandling = () => {
  const toast = useToast();

  /**
   * Displays a toast notification.
   * @param options - Options for the Chakra UI toast.
   */
  const showToast = useCallback((options: UseToastOptions) => {
    toast({
      duration: DEFAULT_TOAST_DURATION,
      isClosable: true,
      position: 'top-right',
      ...options,
    });
  }, [toast]);

  /**
   * Handles an error by logging it and displaying a toast notification.
   * @param error - The error object to handle.
   * @param context - Optional context string to provide more information about where the error occurred.
   * @returns The parsed error message string.
   */
  const handleError = useCallback((error: unknown, context?: string): string => {
    const errorMessage = getErrorMessage(error);
    logError(error, context); // Log the error for debugging

    showToast({
      title: context ? `${context} failed` : 'Error',
      description: errorMessage,
      status: 'error',
    });
    return errorMessage;
  }, [showToast]);

  return {
    handleError,
    showToast,
  };
};
