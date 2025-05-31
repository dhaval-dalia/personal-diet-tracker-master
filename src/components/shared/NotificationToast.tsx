// src/components/shared/NotificationToast.tsx
// This component is a conceptual wrapper or example for how to use Chakra UI's
// useToast hook for displaying notifications. In practice, the useToast hook
// is typically called directly within components or custom hooks (like useErrorHandling).
// This file serves more as a demonstration or if you needed a component to trigger toasts
// based on props changes. For this architecture, `useErrorHandling` is the primary
// way toasts are triggered.

import React, { useEffect } from 'react';
import { useToast, UseToastOptions } from '@chakra-ui/react';
import { DEFAULT_TOAST_DURATION } from '../../utils/constants';

interface NotificationToastProps {
  // Props to trigger a toast from this component
  title: string;
  description?: string;
  status?: 'info' | 'warning' | 'success' | 'error' | 'loading';
  duration?: number;
  isClosable?: boolean;
  position?: UseToastOptions['position'];
  trigger?: number; // A prop that changes to trigger the toast (e.g., a timestamp or counter)
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  title,
  description,
  status = 'info',
  duration = DEFAULT_TOAST_DURATION,
  isClosable = true,
  position = 'top-right',
  trigger, // Use this to imperatively trigger the toast
}) => {
  const toast = useToast();

  useEffect(() => {
    // Only show toast if `trigger` prop is provided and changes,
    // or if you want it to show on initial render (remove `trigger` dependency check)
    if (trigger !== undefined) {
      toast({
        title,
        description,
        status,
        duration,
        isClosable,
        position,
      });
    }
  }, [trigger, toast, title, description, status, duration, isClosable, position]);

  // This component typically doesn't render anything visible itself.
  // Its purpose is to trigger the toast side effect.
  return null;
};

export default NotificationToast;
