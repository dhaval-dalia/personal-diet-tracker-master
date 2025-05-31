// src/components/auth/LoginForm.tsx
// This component provides the user login form. It uses React Hook Form for
// form management and Zod for validation, ensuring data integrity.
// It integrates with the `useAuth` hook for authentication logic and
// `useErrorHandling` for displaying toast notifications.

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Input,
  VStack,
  Heading,
  Text,
  Link,
  useToast,
  FormControl,
  FormErrorMessage,
  Divider,
  HStack,
} from '@chakra-ui/react';
import { loginSchema } from '../../utils/validation';
import { useAuth } from '../../hooks/useAuth';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { useRouter } from 'next/router';
import { FaGoogle } from 'react-icons/fa';
import { supabase } from '../../services/supabase';

type LoginFormInputs = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToSignUp }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const { signIn } = useAuth();
  const { handleError, showToast } = useErrorHandling();

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'email profile',
        },
      });

      if (error) {
        console.error('Google login error:', error);
        throw error;
      }

      if (data?.url) {
        // Redirect to Google's OAuth page
        window.location.href = data.url;
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    try {
      const { user, error } = await signIn(data);

      if (error) {
        throw error;
      }

      if (user) {
        showToast({
          title: 'Login Successful!',
          description: `Welcome back, ${user.email}.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        reset();
        onSuccess?.();
        router.push('/');
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      p={8}
      maxWidth="500px"
      borderWidth={1}
      borderRadius="lg"
      boxShadow="lg"
      bg="whiteAlpha.700"
      borderColor="brand.200"
      mx="auto"
      my={8}
    >
      <VStack gap={4}>
        <Heading as="h2" size="xl" textAlign="center" color="text.dark">
          Welcome Back!
        </Heading>
        <Text fontSize="md" color="text.light" textAlign="center" mb={4}>
          Sign in to track your fitness journey.
        </Text>

        <Button
          onClick={handleGoogleLogin}
          isLoading={isGoogleLoading}
          leftIcon={<FaGoogle />}
          bg="#4285F4"
          color="white"
          _hover={{ bg: '#357ABD' }}
          _active={{ bg: '#2D6DA3' }}
          width="full"
          size="lg"
        >
          Continue with Google
        </Button>

        <HStack width="100%" spacing={4}>
          <Divider />
          <Text color="text.light" fontSize="sm">OR</Text>
          <Divider />
        </HStack>

        <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
          <VStack gap={4}>
            <FormControl isInvalid={!!errors.email}>
              <Text as="label" color="text.dark" mb={2} display="block">
                Email address
              </Text>
              <Input
                type="email"
                {...register('email')}
                placeholder="Enter your email"
                borderColor={errors.email ? 'red.500' : 'brand.200'}
                _focus={{ borderColor: 'brand.300', boxShadow: '0 0 0 1px var(--chakra-colors-brand-300)' }}
              />
              <FormErrorMessage>
                {errors.email && errors.email.message}
              </FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <Text as="label" color="text.dark" mb={2} display="block">
                Password
              </Text>
              <Input
                type="password"
                {...register('password')}
                placeholder="Enter your password"
                borderColor={errors.password ? 'red.500' : 'brand.200'}
                _focus={{ borderColor: 'brand.300', boxShadow: '0 0 0 1px var(--chakra-colors-brand-300)' }}
              />
              <FormErrorMessage>
                {errors.password && errors.password.message}
              </FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              isLoading={isLoading}
              colorScheme="teal"
              variant="solid"
              width="full"
              mt={4}
              bg="accent.100"
              color="text.dark"
              _hover={{ bg: 'accent.200' }}
            >
              Sign In
            </Button>
          </VStack>
        </form>

        <Text textAlign="center" mt={6} color="text.light">
          Don't have an account?{' '}
          <Link onClick={onSwitchToSignUp} color="accent.500" fontWeight="bold">
            Sign Up
          </Link>
        </Text>
      </VStack>
    </Box>
  );
};

export default LoginForm;
