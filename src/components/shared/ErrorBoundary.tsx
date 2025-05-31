// src/components/shared/ErrorBoundary.tsx
// This component implements a React Error Boundary, which catches JavaScript errors
// anywhere in its child component tree, logs those errors, and displays a fallback UI
// instead of the crashed component tree. This prevents the entire application from
// breaking due to an unhandled error in a single component.

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Heading, Text, VStack, Button } from '@chakra-ui/react';
import { logError } from '../../utils/errorHandling'; // Utility to log errors

interface ErrorBoundaryProps {
  children: ReactNode; // The components wrapped by the ErrorBoundary
  fallback?: ReactNode; // Optional custom fallback UI
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  // This static method is called after an error has been thrown by a descendant component.
  // It receives the error that was thrown as a parameter.
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  // This method is called after an error has been thrown. It receives two parameters:
  // error: The error that was thrown.
  // errorInfo: An object with a componentStack key containing information about which component threw the error.
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    logError(error, 'React Component Error');
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  // Reset the error boundary state to allow re-rendering children
  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI using Chakra UI
      return (
        <Box
          p={8}
          m={4}
          bg="red.50" // Light red background for error
          borderRadius="lg"
          boxShadow="xl"
          textAlign="center"
          border="1px solid"
          borderColor="red.200"
        >
          <VStack gap={4}>
            <Heading as="h2" size="xl" color="red.700">
              Oops! Something went wrong.
            </Heading>
            <Text fontSize="lg" color="red.600">
              We're sorry for the inconvenience. Please try refreshing the page or navigating back.
            </Text>
            {this.state.error && (
              <Box p={4} bg="red.100" borderRadius="md" w="full" maxW="lg" overflowX="auto">
                <Text fontSize="sm" fontFamily="monospace" color="red.800" textAlign="left">
                  <strong>Error:</strong> {this.state.error.message}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <Text fontSize="xs" fontFamily="monospace" color="red.700" mt={2} textAlign="left">
                    <strong>Component Stack:</strong>
                    <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </Text>
                )}
              </Box>
            )}
            <Button
              onClick={this.resetError}
              colorScheme="red"
              variant="solid"
              mt={4}
            >
              Try Again
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
