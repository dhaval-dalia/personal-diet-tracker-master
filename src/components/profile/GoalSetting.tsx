// src/components/profile/GoalSetting.tsx
// This component allows users to set and update their fitness and nutrition goals.
// It uses React Hook Form with Zod for validation and interacts directly with Supabase
// to manage user goals.

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
  HStack,
  InputGroup,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Divider,
  useTheme,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  InputRightElement,
  useToast,
} from '@chakra-ui/react';
import { goalSettingSchema } from '../../utils/validation';
import { useAuth } from '../../hooks/useAuth';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { supabase } from '../../services/supabase';
import LoadingSpinner from '../shared/LoadingSpinner';

type AppView = 'login' | 'signup' | 'onboarding' | 'dashboard' | 'log-meal' | 'profile' | 'goals' | 'preferences';

interface GoalSettingProps {
  onViewChange?: (view: AppView) => void;
}

// Define the type for form data based on the Zod schema
type GoalSettingInputs = {
  target_calories?: number;
  target_protein_ratio?: number;
  target_carbs_ratio?: number;
  target_fat_ratio?: number;
  target_weight_kg?: number;
  target_date?: string;
  weekly_workout_goal?: number;
  water_intake_goal?: number;
  sleep_goal?: number;
};

interface UserGoals {
  target_calories?: number;
  target_protein_ratio?: number;
  target_carbs_ratio?: number;
  target_fat_ratio?: number;
  target_weight_kg?: number;
  target_date?: string;
  weekly_workout_goal?: number;
  water_intake_goal?: number;
  sleep_goal?: number;
}

const GoalSetting: React.FC<GoalSettingProps> = ({ onViewChange }) => {
  const { user, isAuthReady } = useAuth();
  const { handleError, showToast } = useErrorHandling();
  const theme = useTheme();
  const toast = useToast();

  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [goals, setGoals] = useState<UserGoals>({
    target_calories: 2000,
    target_protein_ratio: 30,
    target_carbs_ratio: 40,
    target_fat_ratio: 30,
    target_weight_kg: undefined,
    target_date: undefined,
    weekly_workout_goal: 3,
    water_intake_goal: 2,
    sleep_goal: 8,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<GoalSettingInputs>({
    resolver: zodResolver(goalSettingSchema),
    defaultValues: {
      target_calories: goals.target_calories,
      target_protein_ratio: goals.target_protein_ratio,
      target_carbs_ratio: goals.target_carbs_ratio,
      target_fat_ratio: goals.target_fat_ratio,
      target_weight_kg: goals.target_weight_kg,
      target_date: goals.target_date,
      weekly_workout_goal: goals.weekly_workout_goal,
      water_intake_goal: goals.water_intake_goal,
      sleep_goal: goals.sleep_goal,
    },
  });

  // Update form values when goals are loaded
  useEffect(() => {
    if (!isLoadingGoals) {
      reset({
        target_calories: goals.target_calories,
        target_protein_ratio: goals.target_protein_ratio,
        target_carbs_ratio: goals.target_carbs_ratio,
        target_fat_ratio: goals.target_fat_ratio,
        target_weight_kg: goals.target_weight_kg,
        target_date: goals.target_date,
        weekly_workout_goal: goals.weekly_workout_goal,
        water_intake_goal: goals.water_intake_goal,
        sleep_goal: goals.sleep_goal,
      });
    }
  }, [goals, isLoadingGoals, reset]);

  const protein = watch('target_protein_ratio');
  const carbs = watch('target_carbs_ratio');
  const fat = watch('target_fat_ratio');
  const macroSum = (protein || 0) + (carbs || 0) + (fat || 0);
  const showMacroSumWarning = macroSum > 0 && macroSum !== 100;

  useEffect(() => {
    const fetchUserGoals = async () => {
      if (!user?.id || !isAuthReady) {
        setIsLoadingGoals(false);
        return;
      }

      setIsLoadingGoals(true);
      try {
        const { data, error } = await supabase
          .from('user_goals')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setGoals(data);
        }
      } catch (err) {
        handleError(err, 'Failed to load user goals');
      } finally {
        setIsLoadingGoals(false);
      }
    };

    fetchUserGoals();

    const goalSubscription = supabase
      .channel('public:user_goals')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_goals',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new) {
            setGoals(payload.new as UserGoals);
            showToast({
              title: 'Goals Updated!',
              description: 'Your goals have been updated in real-time.',
              status: 'info',
            });
          }
        }
      )
      .subscribe();

    return () => {
      goalSubscription.unsubscribe();
    };
  }, [user?.id, isAuthReady, setGoals, handleError, showToast]);

  const onSubmit = async (data: GoalSettingInputs) => {
    if (!user?.id) {
      handleError('User not authenticated.', 'Authentication Error');
      return;
    }

    setIsSavingGoals(true);
    try {
      // First check if goals exist for this user
      const { data: existingGoals, error: fetchError } = await supabase
        .from('user_goals')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let error;
      if (existingGoals) {
        // Update existing goals
        const { error: updateError } = await supabase
          .from('user_goals')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // Insert new goals
        const { error: insertError } = await supabase
          .from('user_goals')
          .insert({
            user_id: user.id,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        error = insertError;
      }

      if (error) throw error;

      showToast({
        title: 'Goals Saved!',
        description: 'Your fitness goals have been updated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset form and redirect to dashboard
      reset(data);
      
      // Add a small delay to allow the success message to be seen
      setTimeout(() => {
        if (onViewChange) {
          onViewChange('dashboard');
        }
      }, 1000);
    } catch (err) {
      handleError(err, 'Failed to save goals');
    } finally {
      setIsSavingGoals(false);
    }
  };

  if (isLoadingGoals) {
    return <LoadingSpinner message="Loading your goals..." />;
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
          Set Your Goals
        </Heading>
        <Text fontSize="md" color="text.light" textAlign="center" mb={4}>
          Define your fitness and nutritional targets.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={4}>
            <FormControl id="target_weight_kg" isInvalid={!!errors.target_weight_kg}>
              <FormLabel color="text.dark">Target Weight (kg)</FormLabel>
              <NumberInput
                min={20}
                max={300}
                precision={1}
                step={0.1}
                onChange={(_, valueAsNumber) => setValue('target_weight_kg', valueAsNumber)}
                value={watch('target_weight_kg') || ''}
              >
                <NumberInputField
                  {...register('target_weight_kg', { valueAsNumber: true })}
                  placeholder="e.g., 65.0"
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.target_weight_kg?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="target_calories" isInvalid={!!errors.target_calories}>
              <FormLabel color="text.dark">Target Daily Calories (kcal)</FormLabel>
              <NumberInput
                min={500}
                max={5000}
                step={100}
                onChange={(_, valueAsNumber) => setValue('target_calories', valueAsNumber)}
                value={watch('target_calories') || ''}
              >
                <NumberInputField
                  {...register('target_calories', { valueAsNumber: true })}
                  placeholder="e.g., 2000"
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.target_calories?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="target_date" isInvalid={!!errors.target_date}>
              <FormLabel color="text.dark">Target Date</FormLabel>
              <Input
                type="date"
                {...register('target_date')}
                value={watch('target_date') || ''}
                borderColor="brand.200"
                _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
              />
              <FormErrorMessage>{errors.target_date?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="weekly_workout_goal" isInvalid={!!errors.weekly_workout_goal}>
              <FormLabel color="text.dark">Weekly Workout Goal (days)</FormLabel>
              <NumberInput
                min={0}
                max={7}
                onChange={(_, valueAsNumber) => setValue('weekly_workout_goal', valueAsNumber)}
                value={watch('weekly_workout_goal') || ''}
              >
                <NumberInputField
                  {...register('weekly_workout_goal', { valueAsNumber: true })}
                  placeholder="e.g., 3"
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.weekly_workout_goal?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="water_intake_goal" isInvalid={!!errors.water_intake_goal}>
              <FormLabel color="text.dark">Daily Water Intake Goal (liters)</FormLabel>
              <NumberInput
                min={0}
                max={10}
                step={0.5}
                onChange={(_, valueAsNumber) => setValue('water_intake_goal', valueAsNumber)}
                value={watch('water_intake_goal') || ''}
              >
                <NumberInputField
                  {...register('water_intake_goal', { valueAsNumber: true })}
                  placeholder="e.g., 2.0"
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.water_intake_goal?.message}</FormErrorMessage>
            </FormControl>

            <FormControl id="sleep_goal" isInvalid={!!errors.sleep_goal}>
              <FormLabel color="text.dark">Sleep Goal (hours)</FormLabel>
              <NumberInput
                min={4}
                max={12}
                onChange={(_, valueAsNumber) => setValue('sleep_goal', valueAsNumber)}
                value={watch('sleep_goal') || ''}
              >
                <NumberInputField
                  {...register('sleep_goal', { valueAsNumber: true })}
                  placeholder="e.g., 8"
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <FormErrorMessage>{errors.sleep_goal?.message}</FormErrorMessage>
            </FormControl>

            <Divider my={4} borderColor="brand.100" />

            <Heading as="h3" size="md" color="text.dark">
              Macronutrient Ratios (%)
            </Heading>
            <Text fontSize="sm" color="text.light">
              (Optional) Set your target protein, carbs, and fat percentages. They should sum to 100%.
            </Text>

            <HStack gap={4}>
              <FormControl id="target_protein_ratio" isInvalid={!!errors.target_protein_ratio}>
                <FormLabel color="text.dark">Protein</FormLabel>
                <InputGroup>
                  <>
                    <NumberInput
                      min={0}
                      max={100}
                      step={5}
                      onChange={(_, valueAsNumber) => setValue('target_protein_ratio', valueAsNumber)}
                      value={watch('target_protein_ratio') || ''}
                    >
                      <NumberInputField
                        {...register('target_protein_ratio', { valueAsNumber: true })}
                        placeholder="e.g., 30"
                        borderColor="brand.200"
                        _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                      />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <InputRightElement pointerEvents="none" bg="brand.100" color="text.dark">%</InputRightElement>
                  </>
                </InputGroup>
                <FormErrorMessage>{errors.target_protein_ratio?.message}</FormErrorMessage>
              </FormControl>

              <FormControl id="target_carbs_ratio" isInvalid={!!errors.target_carbs_ratio}>
                <FormLabel color="text.dark">Carbs</FormLabel>
                <InputGroup>
                  <>
                    <NumberInput
                      min={0} max={100} step={5}
                      onChange={(_, valueAsNumber) => setValue('target_carbs_ratio', valueAsNumber)}
                      value={watch('target_carbs_ratio') || ''}
                    >
                      <NumberInputField
                        {...register('target_carbs_ratio', { valueAsNumber: true })}
                        placeholder="e.g., 40"
                        borderColor="brand.200"
                        _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                      />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <InputRightElement pointerEvents="none" bg="brand.100" color="text.dark">%</InputRightElement>
                  </>
                </InputGroup>
                <FormErrorMessage>{errors.target_carbs_ratio?.message}</FormErrorMessage>
              </FormControl>

              <FormControl id="target_fat_ratio" isInvalid={!!errors.target_fat_ratio}>
                <FormLabel color="text.dark">Fat</FormLabel>
                <InputGroup>
                  <>
                    <NumberInput
                      min={0} max={100} step={5}
                      onChange={(_, valueAsNumber) => setValue('target_fat_ratio', valueAsNumber)}
                      value={watch('target_fat_ratio') || ''}
                    >
                      <NumberInputField
                        {...register('target_fat_ratio', { valueAsNumber: true })}
                        placeholder="e.g., 30"
                        borderColor="brand.200"
                        _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                      />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <InputRightElement pointerEvents="none" bg="brand.100" color="text.dark">%</InputRightElement>
                  </>
                </InputGroup>
                <FormErrorMessage>{errors.target_fat_ratio?.message}</FormErrorMessage>
              </FormControl>
            </HStack>
            {showMacroSumWarning && (
              <Text color="orange.500" fontSize="sm" mt={2}>
                Macro ratios sum to {macroSum}%. They should sum to 100% if specified.
              </Text>
            )}
            {errors.root?.message && (
              <Text color="red.500" fontSize="sm">{errors.root.message}</Text>
            )}

            <Button
              type="submit"
              isLoading={isSavingGoals}
              disabled={!isDirty || showMacroSumWarning}
              colorScheme="teal"
              variant="solid"
              width="full"
              mt={4}
              bg="accent.500"
              color="white"
              _hover={{ bg: 'accent.600' }}
            >
              Save Goals
            </Button>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
};

export default GoalSetting;
