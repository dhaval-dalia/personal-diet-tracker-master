// src/components/shared/LoadingSpinner.tsx
// A reusable component for displaying a loading spinner.
// It uses Chakra UI's Spinner component for a consistent look and feel.

import React from 'react';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';

interface LoadingSpinnerProps {
  message?: string; // Optional message to display below the spinner
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // Size of the spinner
  color?: string; // Color of the spinner (e.g., "brand.500")
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'lg',
  color = 'brand.500', // Using a color from our pastel theme
}) => {
  return (
    <Center minH="200px" w="100%">
      <VStack gap={4}>
        <Spinner
          size={size}
          color={color}
        />
        <Text color="text.light" fontSize="md">
          {message}
        </Text>
      </VStack>
    </Center>
  );
};

export default LoadingSpinner;
