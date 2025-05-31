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
  FormControl,
  FormLabel,
  FormErrorMessage,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useAuth } from '../../hooks/useAuth';
import { useErrorHandling } from '../../hooks/useErrorHandling';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  user_metadata: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone_number: z.string()
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number must not exceed 15 digits')
      .regex(/^\d+$/, 'Phone number must contain only digits')
  }),
  context: z.object({
    platform: z.string().default('web'),
    source: z.string().default('signup-form')
  })
});

type SignUpFormData = z.infer<typeof signupSchema>;

interface SignUpFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const { signUp } = useAuth();
  const { handleError, showToast } = useErrorHandling();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      context: {
        platform: 'web',
        source: 'signup-form'
      }
    }
  });

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      const signupData = {
        email: data.email,
        password: data.password,
        user_metadata: {
          name: data.user_metadata.name,
          phone_number: data.user_metadata.phone_number
        },
        context: {
          platform: data.context.platform,
          source: data.context.source
        }
      };

      await signUp(signupData);
      showToast({
        title: 'Account Created Successfully!',
        description: 'Please check your email to verify your account.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      reset();
      onSuccess?.();
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
      <VStack spacing={6}>
        <Heading as="h2" size="xl" textAlign="center" color="text.dark">
          Create Account
        </Heading>
        <Text fontSize="md" color="text.light" textAlign="center">
          Join us to start your fitness journey.
        </Text>

        <Box as="form" onSubmit={handleSubmit(onSubmit)} width="100%">
          <VStack spacing={4}>
            <FormControl isInvalid={!!errors.user_metadata?.name}>
              <FormLabel color="text.dark">Name</FormLabel>
              <Input
                type="text"
                {...register('user_metadata.name')}
                placeholder="Enter your name"
                borderColor={errors.user_metadata?.name ? 'red.500' : 'brand.200'}
                _focus={{ 
                  borderColor: errors.user_metadata?.name ? 'red.500' : 'brand.300', 
                  boxShadow: errors.user_metadata?.name 
                    ? '0 0 0 1px var(--chakra-colors-red-500)' 
                    : '0 0 0 1px var(--chakra-colors-brand-300)' 
                }}
              />
              {errors.user_metadata?.name && (
                <FormErrorMessage mt={1}>
                  <Text fontSize="sm" color="red.500">{errors.user_metadata.name.message}</Text>
                </FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={!!errors.email}>
              <FormLabel color="text.dark">Email address</FormLabel>
              <Input
                type="email"
                {...register('email')}
                placeholder="Enter your email"
                borderColor={errors.email ? 'red.500' : 'brand.200'}
                _focus={{ 
                  borderColor: errors.email ? 'red.500' : 'brand.300', 
                  boxShadow: errors.email 
                    ? '0 0 0 1px var(--chakra-colors-red-500)' 
                    : '0 0 0 1px var(--chakra-colors-brand-300)' 
                }}
              />
              {errors.email && (
                <FormErrorMessage mt={2}>
                  <Alert status="error" size="sm" borderRadius="md">
                    <AlertIcon boxSize="16px" />
                    <Text fontSize="sm">{errors.email.message}</Text>
                  </Alert>
                </FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={!!errors.user_metadata?.phone_number}>
              <FormLabel color="text.dark">Phone Number</FormLabel>
              <Input
                type="tel"
                {...register('user_metadata.phone_number')}
                placeholder="Enter your phone number (e.g., 1234567890)"
                borderColor={errors.user_metadata?.phone_number ? 'red.500' : 'brand.200'}
                _focus={{ 
                  borderColor: errors.user_metadata?.phone_number ? 'red.500' : 'brand.300', 
                  boxShadow: errors.user_metadata?.phone_number 
                    ? '0 0 0 1px var(--chakra-colors-red-500)' 
                    : '0 0 0 1px var(--chakra-colors-brand-300)' 
                }}
              />
              {errors.user_metadata?.phone_number && (
                <FormErrorMessage mt={2}>
                  <Alert status="error" size="sm" borderRadius="md">
                    <AlertIcon boxSize="16px" />
                    <Text fontSize="sm">{errors.user_metadata.phone_number.message}</Text>
                  </Alert>
                </FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel color="text.dark">Password</FormLabel>
              <Input
                type="password"
                {...register('password')}
                placeholder="Enter your password (min 8 characters)"
                borderColor={errors.password ? 'red.500' : 'brand.200'}
                _focus={{ 
                  borderColor: errors.password ? 'red.500' : 'brand.300', 
                  boxShadow: errors.password 
                    ? '0 0 0 1px var(--chakra-colors-red-500)' 
                    : '0 0 0 1px var(--chakra-colors-brand-300)' 
                }}
              />
              {errors.password && (
                <FormErrorMessage mt={2}>
                  <Alert status="error" size="sm" borderRadius="md">
                    <AlertIcon boxSize="16px" />
                    <Text fontSize="sm">{errors.password.message}</Text>
                  </Alert>
                </FormErrorMessage>
              )}
            </FormControl>

            <Button
              type="submit"
              isLoading={isLoading}
              loadingText="Creating Account..."
              colorScheme="teal"
              variant="solid"
              width="100%"
              mt={4}
              bg="accent.100"
              color="text.dark"
              _hover={{ bg: 'accent.200' }}
              _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
            >
              {isLoading ? 'Signing up...' : 'Sign Up'}
            </Button>
          </VStack>
        </Box>

        <Text textAlign="center" color="text.light">
          Already have an account?{' '}
          <Link 
            onClick={onSwitchToLogin} 
            color="accent.500" 
            fontWeight="bold"
            cursor="pointer"
            _hover={{ textDecoration: 'underline' }}
          >
            Sign In
          </Link>
        </Text>
      </VStack>
    </Box>
  );
};

export default SignUpForm;
