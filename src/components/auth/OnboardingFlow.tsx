// src/components/auth/OnboardingFlow.tsx
// This component guides new users through an onboarding process to collect
// initial profile data. It utilizes React Hook Form with Zod for validation
// and sends the collected data to the n8n onboarding workflow via an API route.

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Heading,
  Text,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormErrorMessage,
  useTheme,
  VStack,
  HStack,
  Checkbox,
  CheckboxGroup,
  StackDirection,
  useToast,
} from '@chakra-ui/react';
import { useAuth } from '../../hooks/useAuth';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { triggerOnboarding } from '../../services/n8nWebhooks';
import { supabase } from '../../services/supabase';
import { useRouter } from 'next/router';

// Inline validation schema
const onboardingSchema = z.object({
  full_name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  age: z.number()
    .min(10, 'Age must be at least 10 years')
    .max(120, 'Age must not exceed 120 years'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select one from the given list',
  }),
  profession: z.string()
    .min(2, 'Profession must be at least 2 characters')
    .max(100, 'Profession must not exceed 100 characters'),
  work_hours: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
    days: z.array(z.string()).min(1, 'Please select at least one work day')
  }),
  height_cm: z.number()
    .min(50, 'Height must be at least 50 cm')
    .max(250, 'Height must not exceed 250 cm'),
  weight_kg: z.number()
    .min(20, 'Weight must be at least 20 kg')
    .max(300, 'Weight must not exceed 300 kg'),
  activity_level: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extra_active'
  ], {
    required_error: 'Please select one from the given list',
  }),
  dietary_restrictions: z.array(z.string())
    .min(1, 'Please select at least one food preference')
    .max(10, 'You can select up to 10 food preferences'),
  allergies: z.array(z.string())
    .max(10, 'You can select up to 10 allergies'),
  custom_allergies: z.string()
    .max(200, 'Custom allergies description is too long')
    .optional(),
  medical_conditions: z.array(z.string())
    .min(1, 'Please select at least one option')
    .max(10, 'You can select up to 10 medical conditions'),
  preferred_meal_times: z.object({
    breakfast: z.string().optional(),
    lunch: z.string().optional(),
    dinner: z.string().optional()
  }).optional(),
  fitness_level: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: 'Please select your fitness level'
  }),
  preferred_workout_days: z.array(z.string())
    .min(1, 'Please select at least one preferred workout day')
    .max(7, 'You can select up to 7 days'),
  goal_type: z.enum([
    'lose_weight',
    'maintain_weight',
    'gain_weight',
    'build_muscle'
  ], {
    required_error: 'Please select one from the given list',
  }),
  target_weight: z.number()
    .min(20, 'Target weight must be at least 20 kg')
    .max(300, 'Target weight must not exceed 300 kg')
    .optional(),
  target_date: z.string().optional(),
  weekly_workout_goal: z.number()
    .min(0, 'Weekly workout goal must be at least 0 days')
    .max(7, 'Weekly workout goal cannot exceed 7 days')
    .optional(),
  water_intake_goal: z.number()
    .min(0, 'Water intake goal must be at least 0 liters')
    .max(10, 'Water intake goal cannot exceed 10 liters')
    .optional(),
  sleep_goal: z.number()
    .min(4, 'Sleep goal must be at least 4 hours')
    .max(12, 'Sleep goal cannot exceed 12 hours')
    .optional(),
  meal_prep_preference: z.enum(['daily', 'weekly', 'none']).optional(),
}).refine(data => {
  if (data.goal_type === 'lose_weight' && data.target_weight) {
    return data.target_weight < data.weight_kg;
  }
  return true;
}, {
  message: 'Target weight must be less than current weight for weight loss goals',
  path: ['target_weight'],
});

type OnboardingFormInputs = z.infer<typeof onboardingSchema>;

interface OnboardingFlowProps {
  onOnboardingComplete?: () => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onOnboardingComplete }) => {
  const { user } = useAuth();
  const { handleError, showToast } = useErrorHandling();
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    reset,
    setValue,
    trigger,
  } = useForm<OnboardingFormInputs>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      dietary_restrictions: [],
      allergies: [],
      medical_conditions: [],
      preferred_meal_times: {},
      preferred_workout_days: [],
      work_hours: {
        start: '',
        end: '',
        days: []
      }
    },
  });

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    const subscription = watch((formData) => {
      localStorage.setItem('onboardingFormData', JSON.stringify(formData));
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Restore form data from localStorage on mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('onboardingFormData');
    if (savedFormData) {
      const parsedData = JSON.parse(savedFormData) as Partial<OnboardingFormInputs>;
      Object.entries(parsedData).forEach(([key, value]) => {
        if (value !== undefined) {
          setValue(key as keyof OnboardingFormInputs, value as any);
        }
      });
    }
  }, [setValue]);

  // Save step to localStorage
  useEffect(() => {
    localStorage.setItem('onboardingStep', step.toString());
  }, [step]);

  // Restore step on component mount
  useEffect(() => {
    const savedStep = localStorage.getItem('onboardingStep');
    if (savedStep) {
      setStep(parseInt(savedStep, 10));
    }
  }, []);

  const calculateAverageWorkHours = (workHours: any) => {
    if (!workHours.days || workHours.days.length === 0) return 0;
    
    const start = new Date(`2000-01-01T${workHours.start}`);
    const end = new Date(`2000-01-01T${workHours.end}`);
    const hoursPerDay = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.round(hoursPerDay * workHours.days.length / 7);
  };

  const onSubmit = async (data: OnboardingFormInputs) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to complete onboarding',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate average work hours
      const averageWorkHours = calculateAverageWorkHours(data.work_hours);

      // Prepare profile data with proper types
      const profileData = {
        user_id: user.id,
        full_name: data.full_name,
        age: data.age,
        gender: data.gender,
        profession: data.profession || '',
        work_hours: averageWorkHours,
        height_cm: data.height_cm,
        weight_kg: data.weight_kg,
        activity_level: data.activity_level,
        dietary_restrictions: data.dietary_restrictions || [],
        allergies: data.allergies || [],
        custom_allergies: data.custom_allergies || null,
        medical_conditions: data.medical_conditions || [],
        fitness_level: data.fitness_level || 'beginner',
        goal_type: data.goal_type || 'maintain_weight',
        target_weight: data.target_weight || null,
        target_date: data.target_date || null,
        weekly_workout_goal: data.weekly_workout_goal || 0,
        water_intake_goal: data.water_intake_goal || 0,
        sleep_goal: data.sleep_goal || 8,
        meal_prep_preference: data.meal_prep_preference || 'daily',
        updated_at: new Date().toISOString()
      };

      console.log('Saving profile data:', profileData);

      // Save profile data to Supabase
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert([profileData], {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.error('Error saving profile:', profileError);
        throw new Error('Failed to save profile data');
      }

      // Clear localStorage after successful submission
      localStorage.removeItem('onboardingStep');
      localStorage.removeItem('onboardingFormData');

      toast({
        title: 'Success',
        description: 'Your profile has been set up successfully! Redirecting to dashboard...',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Reset form and redirect
      reset();
      
      // Add a small delay to allow the success message to be seen
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } catch (error) {
      console.error('Error in onboarding submission:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save your profile. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateCurrentStep = async () => {
    const currentStepFields = {
      1: ['full_name', 'age', 'gender', 'height_cm', 'weight_kg', 'activity_level'] as const,
      2: ['dietary_restrictions', 'allergies', 'medical_conditions', 'preferred_meal_times', 'fitness_level', 'preferred_workout_days'] as const,
      3: ['goal_type', 'target_weight', 'target_date', 'weekly_workout_goal', 'water_intake_goal', 'sleep_goal', 'meal_prep_preference'] as const
    };

    const fieldsToValidate = currentStepFields[step as keyof typeof currentStepFields];
    const result = await trigger(fieldsToValidate);
    return result;
  };

  const handleNextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      setStep(step + 1);
    }
  };

  return (
    <Box maxW="600px" mx="auto" p={6}>
      <VStack spacing={8} align="stretch">
        <Heading size="lg" textAlign="center">
          {step === 1 ? 'Basic Information' : 
           step === 2 ? 'Health & Preferences' : 
           'Goals & Targets'}
        </Heading>

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 1 && (
            <VStack spacing={4}>
              <FormControl isInvalid={!!errors.full_name}>
                <FormLabel>Full Name</FormLabel>
                <Input 
                  {...register('full_name')} 
                  placeholder="Enter your full name"
                />
                <FormErrorMessage>{errors.full_name?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.age}>
                <FormLabel>Age</FormLabel>
                <NumberInput min={10} max={120}>
                  <NumberInputField 
                    {...register('age', { valueAsNumber: true })} 
                    placeholder="Enter your age"
                  />
                </NumberInput>
                <FormErrorMessage>{errors.age?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.gender}>
                <FormLabel>Gender</FormLabel>
                <Select {...register('gender')}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>
                <FormErrorMessage>{errors.gender?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.profession}>
                <FormLabel>Profession</FormLabel>
                <Input 
                  {...register('profession')} 
                  placeholder="Enter your profession"
                />
                <FormErrorMessage>{errors.profession?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.work_hours}>
                <FormLabel>Work Hours</FormLabel>
                <VStack spacing={2}>
                  <HStack>
                    <Text>Start Time:</Text>
                    <Input 
                      type="time" 
                      {...register('work_hours.start')}
                      onChange={(e) => {
                        setValue('work_hours.start', e.target.value);
                        trigger('work_hours');
                      }}
                    />
                  </HStack>
                  <HStack>
                    <Text>End Time:</Text>
                    <Input 
                      type="time" 
                      {...register('work_hours.end')}
                      onChange={(e) => {
                        setValue('work_hours.end', e.target.value);
                        trigger('work_hours');
                      }}
                    />
                  </HStack>
                  <FormLabel>Work Days</FormLabel>
                  <CheckboxGroup 
                    onChange={(values: string[]) => {
                      setValue('work_hours.days', values);
                      trigger('work_hours');
                    }}
                  >
                    <Stack direction="row" wrap="wrap">
                      <Checkbox value="monday">Mon</Checkbox>
                      <Checkbox value="tuesday">Tue</Checkbox>
                      <Checkbox value="wednesday">Wed</Checkbox>
                      <Checkbox value="thursday">Thu</Checkbox>
                      <Checkbox value="friday">Fri</Checkbox>
                      <Checkbox value="saturday">Sat</Checkbox>
                      <Checkbox value="sunday">Sun</Checkbox>
                    </Stack>
                  </CheckboxGroup>
                </VStack>
                <FormErrorMessage>{errors.work_hours?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.height_cm}>
                <FormLabel>Height (cm)</FormLabel>
                <NumberInput min={50} max={250}>
                  <NumberInputField 
                    {...register('height_cm', { valueAsNumber: true })} 
                    placeholder="Enter your height"
                  />
                </NumberInput>
                <FormErrorMessage>{errors.height_cm?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.weight_kg}>
                <FormLabel>Weight (kg)</FormLabel>
                <NumberInput min={20} max={300}>
                  <NumberInputField 
                    {...register('weight_kg', { valueAsNumber: true })} 
                    placeholder="Enter your weight"
                  />
                </NumberInput>
                <FormErrorMessage>{errors.weight_kg?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.activity_level}>
                <FormLabel>Activity Level</FormLabel>
                <Select {...register('activity_level')}>
                  <option value="">Select activity level</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="lightly_active">Lightly Active</option>
                  <option value="moderately_active">Moderately Active</option>
                  <option value="very_active">Very Active</option>
                  <option value="extra_active">Extra Active</option>
                </Select>
                <FormErrorMessage>{errors.activity_level?.message}</FormErrorMessage>
              </FormControl>
            </VStack>
          )}

          {step === 2 && (
            <VStack spacing={4}>
              <FormControl isInvalid={!!errors.dietary_restrictions}>
                <FormLabel>Food Type Preferences</FormLabel>
                <CheckboxGroup 
                  onChange={(values: string[]) => {
                    setValue('dietary_restrictions', values);
                    trigger('dietary_restrictions');
                  }}
                  defaultValue={watch('dietary_restrictions')}
                >
                  <Stack>
                    <Checkbox value="vegetarian">Vegetarian</Checkbox>
                    <Checkbox value="non_vegetarian">Non-Vegetarian</Checkbox>
                    <Checkbox value="vegan">Vegan</Checkbox>
                    <Checkbox value="eggetarian">Eggetarian</Checkbox>
                    <Checkbox value="pescatarian">Pescatarian</Checkbox>
                    <Checkbox value="gluten_free">Gluten-Free</Checkbox>
                    <Checkbox value="dairy_free">Dairy-Free</Checkbox>
                    <Checkbox value="halal">Halal</Checkbox>
                    <Checkbox value="kosher">Kosher</Checkbox>
                  </Stack>
                </CheckboxGroup>
                <FormErrorMessage>{errors.dietary_restrictions?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.allergies}>
                <FormLabel>I am allergic to</FormLabel>
                <CheckboxGroup 
                  onChange={(values: string[]) => {
                    setValue('allergies', values);
                    trigger('allergies');
                  }}
                  defaultValue={watch('allergies')}
                >
                  <Stack>
                    <Checkbox value="nuts">Nuts</Checkbox>
                    <Checkbox value="shellfish">Shellfish</Checkbox>
                    <Checkbox value="dairy">Dairy</Checkbox>
                    <Checkbox value="eggs">Eggs</Checkbox>
                    <Checkbox value="soy">Soy</Checkbox>
                    <Checkbox value="wheat">Wheat</Checkbox>
                    <Checkbox value="fish">Fish</Checkbox>
                    <Checkbox value="sesame">Sesame</Checkbox>
                    <Checkbox value="peanuts">Peanuts</Checkbox>
                  </Stack>
                </CheckboxGroup>
                <FormErrorMessage>{errors.allergies?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.custom_allergies}>
                <FormLabel>Other Allergies</FormLabel>
                <Input
                  placeholder="I am allergic to..."
                  {...register('custom_allergies')}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value && !value.startsWith('I am allergic to')) {
                      setValue('custom_allergies', `I am allergic to ${value}`);
                    }
                    trigger('custom_allergies');
                  }}
                />
                <FormErrorMessage>{errors.custom_allergies?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.medical_conditions}>
                <FormLabel>Medical Conditions</FormLabel>
                <CheckboxGroup 
                  onChange={(values: string[]) => {
                    setValue('medical_conditions', values);
                    trigger('medical_conditions');
                  }}
                  defaultValue={watch('medical_conditions')}
                >
                  <Stack>
                    <Checkbox value="fit_and_fine">I am fit and fine</Checkbox>
                    <Checkbox value="diabetes">Diabetes</Checkbox>
                    <Checkbox value="hypertension">Hypertension</Checkbox>
                    <Checkbox value="heart_disease">Heart Disease</Checkbox>
                    <Checkbox value="thyroid">Thyroid Issues</Checkbox>
                  </Stack>
                </CheckboxGroup>
                <FormErrorMessage>{errors.medical_conditions?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.preferred_meal_times}>
                <FormLabel>Preferred Meal Times</FormLabel>
                <VStack spacing={2}>
                  <HStack>
                    <Text>Breakfast:</Text>
                    <Input 
                      type="time" 
                      onChange={(e) => {
                        setValue('preferred_meal_times.breakfast', e.target.value);
                        trigger('preferred_meal_times');
                      }}
                      defaultValue={watch('preferred_meal_times.breakfast')}
                    />
                  </HStack>
                  <HStack>
                    <Text>Lunch:</Text>
                    <Input 
                      type="time" 
                      onChange={(e) => {
                        setValue('preferred_meal_times.lunch', e.target.value);
                        trigger('preferred_meal_times');
                      }}
                      defaultValue={watch('preferred_meal_times.lunch')}
                    />
                  </HStack>
                  <HStack>
                    <Text>Dinner:</Text>
                    <Input 
                      type="time" 
                      onChange={(e) => {
                        setValue('preferred_meal_times.dinner', e.target.value);
                        trigger('preferred_meal_times');
                      }}
                      defaultValue={watch('preferred_meal_times.dinner')}
                    />
                  </HStack>
                </VStack>
                <FormErrorMessage>{errors.preferred_meal_times?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.fitness_level}>
                <FormLabel>Fitness Level</FormLabel>
                <Select 
                  {...register('fitness_level')}
                  onChange={(e) => {
                    setValue('fitness_level', e.target.value as 'beginner' | 'intermediate' | 'advanced');
                    trigger('fitness_level');
                  }}
                >
                  <option value="">Select fitness level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </Select>
                <FormErrorMessage>{errors.fitness_level?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.preferred_workout_days}>
                <FormLabel>Preferred Workout Days</FormLabel>
                <CheckboxGroup 
                  onChange={(values: string[]) => {
                    setValue('preferred_workout_days', values);
                    trigger('preferred_workout_days');
                  }}
                  defaultValue={watch('preferred_workout_days')}
                >
                  <Stack direction="row" wrap="wrap">
                    <Checkbox value="monday">Mon</Checkbox>
                    <Checkbox value="tuesday">Tue</Checkbox>
                    <Checkbox value="wednesday">Wed</Checkbox>
                    <Checkbox value="thursday">Thu</Checkbox>
                    <Checkbox value="friday">Fri</Checkbox>
                    <Checkbox value="saturday">Sat</Checkbox>
                    <Checkbox value="sunday">Sun</Checkbox>
                  </Stack>
                </CheckboxGroup>
                <FormErrorMessage>{errors.preferred_workout_days?.message}</FormErrorMessage>
              </FormControl>
            </VStack>
          )}

          {step === 3 && (
            <VStack spacing={4}>
              <FormControl isInvalid={!!errors.goal_type}>
                <FormLabel>Primary Goal</FormLabel>
                <Select {...register('goal_type')}>
                  <option value="lose_weight">Lose Weight</option>
                  <option value="maintain_weight">Maintain Weight</option>
                  <option value="gain_weight">Gain Weight</option>
                  <option value="build_muscle">Build Muscle</option>
                </Select>
                <FormErrorMessage>{errors.goal_type?.message}</FormErrorMessage>
              </FormControl>

              {watch('goal_type') === 'lose_weight' && (
                <>
                  <FormControl>
                    <FormLabel>Target Weight (kg)</FormLabel>
                    <NumberInput min={20} max={300}>
                      <NumberInputField {...register('target_weight', { valueAsNumber: true })} />
                    </NumberInput>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Target Date</FormLabel>
                    <Input type="date" {...register('target_date')} />
                  </FormControl>
                </>
              )}

              <FormControl>
                <FormLabel>Weekly Workout Goal (days)</FormLabel>
                <NumberInput min={0} max={7}>
                  <NumberInputField {...register('weekly_workout_goal', { valueAsNumber: true })} />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Daily Water Intake Goal (liters)</FormLabel>
                <NumberInput min={0} max={10} step={0.5}>
                  <NumberInputField {...register('water_intake_goal', { valueAsNumber: true })} />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Sleep Goal (hours)</FormLabel>
                <NumberInput min={4} max={12}>
                  <NumberInputField {...register('sleep_goal', { valueAsNumber: true })} />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Meal Prep Preference</FormLabel>
                <Select {...register('meal_prep_preference')}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="none">No Meal Prep</option>
                </Select>
              </FormControl>
            </VStack>
          )}

          <HStack justify="space-between" mt={8}>
            {step > 1 && (
              <Button onClick={() => setStep(step - 1)}>
                Previous
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={handleNextStep}>
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isSubmitting}
                loadingText="Saving..."
              >
                Complete Setup
              </Button>
            )}
          </HStack>
        </form>
      </VStack>
    </Box>
  );
};

export default OnboardingFlow;
