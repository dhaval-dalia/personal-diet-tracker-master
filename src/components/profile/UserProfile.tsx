// src/components/profile/UserProfile.tsx
// This component displays and allows users to edit their profile information.
// It uses React Hook Form with Zod for validation and interacts directly with Supabase
// to fetch and update user profile data.

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Input,
  Stack,
  Heading,
  Text,
  Select,
  useTheme,
  FormControl,
  FormLabel,
  FormErrorMessage,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Alert,
  AlertIcon,
  useToast,
  HStack,
  Checkbox,
  CheckboxGroup,
  VStack,
} from '@chakra-ui/react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import LoadingSpinner from '../shared/LoadingSpinner';
import { useRouter } from 'next/router';

// Define the validation schema
const userProfileSchema = z.object({
  fullName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters'),
  age: z.number()
    .min(10, 'Age must be at least 10 years')
    .max(120, 'Age must not exceed 120 years'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select your gender',
  }),
  profession: z.string()
    .min(2, 'Profession must be at least 2 characters')
    .max(100, 'Profession must not exceed 100 characters'),
  workHours: z.object({
    average_hours: z.number().int().min(0).max(24).optional()
  }),
  heightCm: z.number()
    .min(50, 'Height must be at least 50 cm')
    .max(250, 'Height must not exceed 250 cm'),
  weightKg: z.number()
    .min(20, 'Weight must be at least 20 kg')
    .max(300, 'Weight must not exceed 300 kg'),
  activityLevel: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extra_active'
  ], {
    required_error: 'Please select your activity level',
  }),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  customAllergies: z.string().optional(),
  medicalConditions: z.array(z.string()).optional(),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  goal: z.enum(['lose_weight', 'maintain_weight', 'gain_weight', 'build_muscle']).optional(),
  sleepHours: z.number().min(4).max(12).optional(),
});

type UserProfileInputs = z.infer<typeof userProfileSchema>;

// Add type for work days
type WorkDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

type AppView = 'login' | 'signup' | 'onboarding' | 'dashboard' | 'log-meal' | 'profile' | 'goals' | 'preferences';

interface UserProfileProps {
  onViewChange?: (view: AppView) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onViewChange }) => {
  const { user } = useAuth();
  const theme = useTheme();
  const toast = useToast();
  const router = useRouter();
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm<UserProfileInputs>({
    resolver: zodResolver(userProfileSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      age: undefined,
      gender: undefined,
      profession: '',
      workHours: {
        average_hours: 0
      },
      heightCm: undefined,
      weightKg: undefined,
      activityLevel: undefined,
      dietaryRestrictions: [],
      allergies: [],
      customAllergies: '',
      medicalConditions: [],
      fitnessLevel: undefined,
      goal: undefined,
      sleepHours: undefined,
    },
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        setIsLoadingProfile(false);
        return;
      }

      try {
        console.log('Fetching profile for user:', user.id);
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          throw error;
        }

        if (data) {
          console.log('Profile data received:', data);
          reset({
            fullName: data.full_name || '',
            age: data.age || undefined,
            gender: data.gender || undefined,
            profession: data.profession || '',
            workHours: {
              average_hours: data.work_hours || 0
            },
            heightCm: data.height_cm || undefined,
            weightKg: data.weight_kg || undefined,
            activityLevel: data.activity_level || undefined,
            dietaryRestrictions: data.dietary_restrictions || [],
            allergies: data.allergies || [],
            customAllergies: data.custom_allergies || '',
            medicalConditions: data.medical_conditions || [],
            fitnessLevel: data.fitness_level || undefined,
            goal: data.goal_type || undefined,
            sleepHours: data.sleep_hours || undefined,
          });

          // Check for missing required fields
          const missingFields = [];
          if (!data.full_name) missingFields.push('Full Name');
          if (!data.age) missingFields.push('Age');
          if (!data.gender) missingFields.push('Gender');
          if (!data.height_cm) missingFields.push('Height');
          if (!data.weight_kg) missingFields.push('Weight');
          if (!data.activity_level) missingFields.push('Activity Level');
          if (!data.profession) missingFields.push('Profession');
          if (data.work_hours === null || data.work_hours === undefined) missingFields.push('Work Hours');
          if (!data.dietary_restrictions) missingFields.push('Dietary Restrictions');
          if (!data.allergies) missingFields.push('Allergies');
          if (!data.medical_conditions) missingFields.push('Medical Conditions');
          if (!data.fitness_level) missingFields.push('Fitness Level');

          if (missingFields.length > 0) {
            setError('incomplete_profile');
          }
        }
      } catch (err) {
        console.error('Error in fetchUserProfile:', err);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchUserProfile();
  }, [user?.id, reset]);

  const calculateAverageHours = (workHours: any) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const validHours = days
      .map(day => workHours[day])
      .filter(hours => hours !== undefined && hours !== null && !isNaN(hours));
    
    if (validHours.length === 0) return 0;
    return Math.round(validHours.reduce((a, b) => a + b, 0) / validHours.length);
  };

  const onSubmit = async (data: UserProfileInputs) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update your profile',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      console.log('Raw form data:', data);
      const averageHours = data.workHours.average_hours || 0;
      
      // Match the structure used in OnboardingFlow
      const profileData = {
        user_id: user.id,
        full_name: data.fullName,
        age: data.age,
        gender: data.gender,
        profession: data.profession,
        work_hours: averageHours,
        height_cm: data.heightCm,
        weight_kg: data.weightKg,
        activity_level: data.activityLevel,
        dietary_restrictions: data.dietaryRestrictions || [],
        allergies: data.allergies || [],
        custom_allergies: data.customAllergies || null,
        medical_conditions: data.medicalConditions || [],
        fitness_level: data.fitnessLevel || 'beginner',
        goal_type: data.goal || 'maintain_weight',
        updated_at: new Date().toISOString()
      };

      console.log('Final profile data being sent:', profileData);
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert([profileData], {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving profile:', error);
        throw new Error(error.message || 'Failed to update profile');
      }

      toast({
        title: 'Success',
        description: 'Your profile has been updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset form state
      reset(data);

      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Error in onSubmit:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update profile. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoadingProfile) {
    return <LoadingSpinner message="Loading your profile..." />;
  }

  if (error === 'incomplete_profile') {
    return (
      <Box p={8}>
        <VStack spacing={8} align="stretch">
          <Box
            p={8}
            bg="white"
            borderRadius="lg"
            boxShadow="lg"
            borderWidth={1}
            borderColor="brand.200"
          >
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" color="brand.500">
                Complete Your Profile
              </Heading>
              <Text fontSize="lg" color="gray.600" textAlign="center">
                To get the most out of your diet tracker, please complete your profile setup.
              </Text>
              
              <Box bg="brand.50" p={6} borderRadius="md">
                <VStack spacing={4} align="stretch">
                  <Heading size="md" color="brand.700">
                    Required Information
                  </Heading>
                  <Text color="gray.600">
                    Please provide the following information to get started:
                  </Text>
                  <VStack align="start" spacing={2} pl={4}>
                    <Text>• Basic Information (Name, Age, Gender)</Text>
                    <Text>• Physical Measurements (Height, Weight)</Text>
                    <Text>• Activity Level and Profession</Text>
                    <Text>• Health Information (Allergies, Medical Conditions)</Text>
                    <Text>• Fitness Goals and Preferences</Text>
                  </VStack>
                </VStack>
              </Box>

              <VStack spacing={4} pt={4}>
                <Button
                  colorScheme="brand"
                  size="lg"
                  width="full"
                  onClick={() => router.push('/onboarding')}
                >
                  Complete Onboarding
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  width="full"
                  onClick={() => router.push('/dashboard')}
                >
                  Back to Dashboard
                </Button>
              </VStack>
            </VStack>
          </Box>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8}>
        <VStack spacing={6} textAlign="center">
          <Heading size="xl" color="red.500">Error</Heading>
          <Text fontSize="lg" color="gray.600">
            {error}
          </Text>
          <Button
            colorScheme="brand"
            size="lg"
            onClick={() => window.location.reload()}
          >
            Try Again
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box
      p={8}
      maxWidth="600px"
      borderWidth={1}
      borderRadius="lg"
      boxShadow="lg"
      bg="whiteAlpha.700"
      borderColor="brand.200"
      mx="auto"
      my={8}
    >
      <Stack gap={6}>
        <Heading as="h2" size="xl" textAlign="center" color="text.dark">
          Your Profile
        </Heading>
        <Text fontSize="md" color="text.light" textAlign="center" mb={4}>
          Manage your personal details and fitness metrics.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={4}>
            <FormControl id="fullName" isInvalid={!!errors.fullName} isRequired>
              <FormLabel color="text.dark">Full Name</FormLabel>
              <Input
                {...register('fullName')}
                placeholder="John Doe"
                borderColor="brand.200"
                _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
              />
              <FormErrorMessage>{errors.fullName?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="age" isInvalid={!!errors.age} isRequired>
              <FormLabel color="text.dark">Age</FormLabel>
              <NumberInput
                min={10}
                max={120}
                onChange={(_, valueAsNumber) => setValue('age', valueAsNumber)}
                value={watch('age')}
              >
                <NumberInputField
                  {...register('age', { valueAsNumber: true })}
                  placeholder="e.g., 30"
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.age?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="gender" isInvalid={!!errors.gender} isRequired>
              <FormLabel color="text.dark">Gender</FormLabel>
              <Select
                placeholder="Select gender"
                {...register('gender')}
                borderColor="brand.200"
                _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </Select>
              <FormErrorMessage>{errors.gender?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="profession" isInvalid={!!errors.profession} isRequired>
              <FormLabel color="text.dark">Profession</FormLabel>
              <Input
                {...register('profession')}
                placeholder="Enter your profession"
                borderColor="brand.200"
                _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
              />
              <FormErrorMessage>{errors.profession?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="workHours" isInvalid={!!errors.workHours}>
              <FormLabel color="text.dark">Average Work Hours per Day</FormLabel>
              <NumberInput
                min={0}
                max={24}
                precision={1}
                step={0.5}
                onChange={(_, valueAsNumber) => {
                  setValue('workHours.average_hours', valueAsNumber);
                  trigger('workHours');
                }}
                value={watch('workHours.average_hours')}
              >
                <NumberInputField
                  {...register('workHours.average_hours', { valueAsNumber: true })}
                  placeholder="Hours per day"
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.workHours?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="heightCm" isInvalid={!!errors.heightCm} isRequired>
              <FormLabel color="text.dark">Height (cm)</FormLabel>
              <NumberInput
                min={50}
                max={250}
                onChange={(_, valueAsNumber) => setValue('heightCm', valueAsNumber)}
                value={watch('heightCm')}
              >
                <NumberInputField
                  {...register('heightCm', { valueAsNumber: true })}
                  placeholder="e.g., 170"
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.heightCm?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="weightKg" isInvalid={!!errors.weightKg} isRequired>
              <FormLabel color="text.dark">Current Weight (kg)</FormLabel>
              <NumberInput
                min={20}
                max={300}
                precision={1}
                step={0.1}
                onChange={(_, valueAsNumber) => setValue('weightKg', valueAsNumber)}
                value={watch('weightKg')}
              >
                <NumberInputField
                  {...register('weightKg', { valueAsNumber: true })}
                  placeholder="e.g., 70.5"
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.weightKg?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="activityLevel" isInvalid={!!errors.activityLevel} isRequired>
              <FormLabel color="text.dark">Activity Level</FormLabel>
              <Select
                placeholder="Select activity level"
                {...register('activityLevel')}
                borderColor="brand.200"
                _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
              >
                <option value="sedentary">Sedentary (little or no exercise)</option>
                <option value="lightly_active">Lightly Active (light exercise/sports 1-3 days/week)</option>
                <option value="moderately_active">Moderately Active (moderate exercise/sports 3-5 days/week)</option>
                <option value="very_active">Very Active (hard exercise/sports 6-7 days/week)</option>
                <option value="extra_active">Extra Active (very hard exercise/physical job)</option>
              </Select>
              <FormErrorMessage>{errors.activityLevel?.message}</FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              isLoading={isSavingProfile}
              disabled={!isDirty}
              colorScheme="teal"
              variant="solid"
              width="full"
              mt={4}
              bg="accent.500"
              color="white"
              _hover={{ bg: 'accent.600' }}
            >
              Save Profile
            </Button>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
};

export default UserProfile;
