// src/pages/index.tsx
'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Box, Text, Button, VStack, Heading, Container, useColorModeValue } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import LoginForm from '@/components/auth/LoginForm';
import SignUpForm from '@/components/auth/SignUpForm';

const HomePage: React.FC = () => {
  const { user, isAuthReady } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  const router = useRouter();
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  // If user is authenticated, redirect to dashboard
  if (user) {
    router.push('/dashboard');
    return null;
  }

  // If auth is not ready, show loading
  if (!isAuthReady) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Text>Loading...</Text>
      </Box>
    );
  }

  // Show landing page with auth forms
  return (
    <Box minHeight="100vh" bg="gray.50">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8} align="center">
          <Heading as="h1" size="2xl" textAlign="center" color={textColor}>
            Welcome to Fitness Tracker
          </Heading>
          <Text fontSize="xl" textAlign="center" color="text.light">
            Track your nutrition, set goals, and achieve your fitness objectives
          </Text>
          
          <Box
            p={8}
            maxWidth="500px"
            borderWidth={1}
            borderRadius="lg"
            boxShadow="lg"
            bg={bgColor}
            borderColor="brand.200"
            width="100%"
          >
            {showSignUp ? (
              <SignUpForm 
                onSuccess={() => {
                  setShowSignUp(false);
                }}
                onSwitchToLogin={() => setShowSignUp(false)}
              />
            ) : (
              <LoginForm 
                onSuccess={() => {
                  // User will be automatically redirected when auth state changes
                }}
                onSwitchToSignUp={() => setShowSignUp(true)}
              />
            )}
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};

export default HomePage;
