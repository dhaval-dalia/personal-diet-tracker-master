import React, { useState } from 'react';
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
} from '@chakra-ui/react';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { useAuth } from '../../hooks/useAuth';

// Define the schema for quick add food items
const quickAddFoodSchema = z.object({
  name: z.string().min(1, 'Food name is required'),
  calories_per_serving: z.number().min(0, 'Calories must be 0 or greater'),
  protein_per_serving: z.number().min(0, 'Protein must be 0 or greater'),
  carbs_per_serving: z.number().min(0, 'Carbs must be 0 or greater'),
  fat_per_serving: z.number().min(0, 'Fat must be 0 or greater'),
  serving_size: z.number().min(0.1, 'Serving size must be greater than 0'),
  serving_unit: z.string().min(1, 'Serving unit is required'),
  barcode: z.string().optional(),
});

// Export the type for use in other files
export type QuickAddFoodInputs = z.infer<typeof quickAddFoodSchema>;

export interface QuickAddProps {
  onQuickAdd: (food: QuickAddFoodInputs) => void;
}

const QuickAdd: React.FC<QuickAddProps> = ({ onQuickAdd }) => {
  const { handleError, showToast } = useErrorHandling();
  const [isFetchingMacros, setIsFetchingMacros] = useState(false);
  const { user, session } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isValid },
    reset,
  } = useForm<QuickAddFoodInputs>({
    resolver: zodResolver(quickAddFoodSchema),
    defaultValues: {
      name: '',
      calories_per_serving: 0,
      protein_per_serving: 0,
      carbs_per_serving: 0,
      fat_per_serving: 0,
      serving_size: 1,
      serving_unit: 'serving',
    },
    mode: 'onChange',
  });

  // Function to fetch macro details using n8n webhook
  const fetchMacroDetails = async (foodName: string) => {
    if (!user || !session) {
      showToast({
        title: 'Authentication Required',
        description: 'Please sign in to fetch macro details.',
        status: 'warning',
      });
      return;
    }

    setIsFetchingMacros(true);
    try {
      const requestBody = {
        user_id: user.id,
        user_email: user.email,
        user_metadata: user.user_metadata,
        meal_description: foodName,
        source: 'quick-add',
        context: {
          platform: 'web',
          source: 'quick-add',
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }
      };

      const webhookUrl = 'https://dhaval-dalia.app.n8n.cloud/webhook/log-meal-prod';
      
      console.log('Sending request to webhook:', {
        url: webhookUrl,
        body: requestBody
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': window.location.origin,
        },
        body: JSON.stringify(requestBody),
      });

      // Log the response details
      console.log('Response details:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Check if response is empty
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!responseText) {
        console.error('Empty response received from server');
        throw new Error('Server returned an empty response');
      }

      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', {
          error: parseError,
          responseText: responseText.substring(0, 200), // Log first 200 chars of response
          responseLength: responseText.length
        });
        throw new Error('Invalid JSON response from server');
      }

      // Validate response structure
      if (!data) {
        console.error('Empty data object received');
        throw new Error('Invalid response: Empty data object');
      }

      if (!data.success) {
        console.error('Request was not successful:', data);
        throw new Error(data.error || 'Request was not successful');
      }

      if (!Array.isArray(data.meal) || data.meal.length === 0) {
        console.error('Invalid meal data structure:', data);
        throw new Error('No meal data found in response');
      }

      const foodItem = data.meal[0];
      
      // Validate food item data
      if (!foodItem) {
        console.error('Invalid food item data:', foodItem);
        throw new Error('Invalid food item data received');
      }

      // Set form values with validation
      setValue('calories_per_serving', Number(foodItem.calories) || 0);
      setValue('protein_per_serving', Number(foodItem.protein) || 0);
      setValue('carbs_per_serving', Number(foodItem.carbs) || 0);
      setValue('fat_per_serving', Number(foodItem.fat) || 0);
      setValue('serving_size', Number(foodItem.quantity) || 1);
      setValue('serving_unit', foodItem.unit || 'serving');
      
      showToast({
        title: 'Macros Fetched',
        description: `Macro details for ${foodName} have been autofilled.`,
        status: 'info',
      });
    } catch (error) {
      console.error('Error in fetchMacroDetails:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Show a more specific error message based on the error type
      let errorMessage = 'Unable to fetch nutritional information. Please try again or enter the values manually.';
      if (error instanceof Error) {
        if (error.message.includes('empty response')) {
          errorMessage = 'The server returned an empty response. Please try again later.';
        } else if (error.message.includes('JSON')) {
          errorMessage = 'The server returned an invalid response. Please try again later.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('meal data')) {
          errorMessage = 'No nutritional information found for this food item. Please enter the values manually.';
        }
      }

      showToast({
        title: 'Failed to Fetch Macros',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });

      handleError(error, 'Failed to fetch macro details');
    } finally {
      setIsFetchingMacros(false);
    }
  };

  // Handle form submission for final logging
  const onSubmit = async (data: QuickAddFoodInputs) => {
    try {
      await onQuickAdd(data);
      showToast({
        title: 'Food Added!',
        description: `${data.name} added to your meal.`,
        status: 'success',
      });
      reset();
    } catch (error) {
      handleError(error, 'Failed to quick add food');
    }
  };

  // Handle fetching macros when food name is entered
  const handleFetchMacros = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    const foodName = (document.getElementById('quick-name') as HTMLInputElement)?.value;
    if (foodName && foodName.trim().length > 0) {
      fetchMacroDetails(foodName);
    } else {
      showToast({
        title: 'Input Required',
        description: 'Please enter a food name to fetch details.',
        status: 'warning',
      });
    }
  };

  return (
    <Box p={4} borderRadius="md" bg="whiteAlpha.700" boxShadow="md" borderColor="brand.200" borderWidth={1}>
      <Stack gap={4}>
        <Heading as="h3" size="md" textAlign="center" color="text.dark">
          Quick Add Food
        </Heading>
        <Text fontSize="sm" color="text.light" textAlign="center">
          Quickly add a food item with just a name and fetch macro details.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Stack gap={3}>
            <div>
              <label htmlFor="quick-name" className="block text-sm font-medium text-gray-700">
                Food Name *
              </label>
              <Input
                id="quick-name"
                {...register('name')}
                placeholder="e.g., Apple, Coffee"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300"
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">{errors.name.message}</p>
              )}
            </div>

            <Button
              type="button"
              onClick={handleFetchMacros}
              isLoading={isFetchingMacros}
              colorScheme="blue"
              variant="outline"
              width="full"
              mt={2}
              _hover={{ bg: 'blue.50' }}
              isDisabled={isFetchingMacros}
            >
              {isFetchingMacros ? 'Fetching Macros...' : 'Fetch Macro Details'}
            </Button>

            <div>
              <label htmlFor="quick-calories" className="block text-sm font-medium text-gray-700">
                Calories (kcal) *
              </label>
              <Input
                id="quick-calories"
                type="number"
                min={0}
                max={5000}
                step={1}
                {...register('calories_per_serving', {
                  valueAsNumber: true,
                  onChange: (e) => {
                    const value = e.target.value;
                    if (value < 0) e.target.value = 0;
                    if (value > 5000) e.target.value = 5000;
                  },
                })}
                placeholder="e.g., 100"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300"
                aria-invalid={errors.calories_per_serving ? "true" : "false"}
                aria-describedby={errors.calories_per_serving ? "calories-error" : undefined}
              />
              {errors.calories_per_serving && (
                <p id="calories-error" className="mt-1 text-sm text-red-600" role="alert">{errors.calories_per_serving.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="quick-protein" className="block text-sm font-medium text-gray-700">
                Protein (g)
              </label>
              <Input
                id="quick-protein"
                type="number"
                min={0}
                max={500}
                step={0.1}
                {...register('protein_per_serving', {
                  valueAsNumber: true,
                  onChange: (e) => {
                    const value = e.target.value;
                    if (value < 0) e.target.value = 0;
                    if (value > 500) e.target.value = 500;
                  },
                })}
                placeholder="e.g., 5"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300"
                aria-invalid={errors.protein_per_serving ? "true" : "false"}
                aria-describedby={errors.protein_per_serving ? "protein-error" : undefined}
              />
              {errors.protein_per_serving && (
                <p id="protein-error" className="mt-1 text-sm text-red-600" role="alert">{errors.protein_per_serving.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="quick-carbs" className="block text-sm font-medium text-gray-700">
                Carbs (g)
              </label>
              <Input
                id="quick-carbs"
                type="number"
                min={0}
                max={500}
                step={0.1}
                {...register('carbs_per_serving', {
                  valueAsNumber: true,
                  onChange: (e) => {
                    const value = e.target.value;
                    if (value < 0) e.target.value = 0;
                    if (value > 500) e.target.value = 500;
                  },
                })}
                placeholder="e.g., 20"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300"
                aria-invalid={errors.carbs_per_serving ? "true" : "false"}
                aria-describedby={errors.carbs_per_serving ? "carbs-error" : undefined}
              />
              {errors.carbs_per_serving && (
                <p id="carbs-error" className="mt-1 text-sm text-red-600" role="alert">{errors.carbs_per_serving.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="quick-fat" className="block text-sm font-medium text-gray-700">
                Fat (g)
              </label>
              <Input
                id="quick-fat"
                type="number"
                min={0}
                max={500}
                step={0.1}
                {...register('fat_per_serving', {
                  valueAsNumber: true,
                  onChange: (e) => {
                    const value = e.target.value;
                    if (value < 0) e.target.value = 0;
                    if (value > 500) e.target.value = 500;
                  },
                })}
                placeholder="e.g., 10"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300"
                aria-invalid={errors.fat_per_serving ? "true" : "false"}
                aria-describedby={errors.fat_per_serving ? "fat-error" : undefined}
              />
              {errors.fat_per_serving && (
                <p id="fat-error" className="mt-1 text-sm text-red-600" role="alert">{errors.fat_per_serving.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="quick-serving-size" className="block text-sm font-medium text-gray-700">
                Serving Size *
              </label>
              <Input
                id="quick-serving-size"
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                {...register('serving_size', {
                  valueAsNumber: true,
                  onChange: (e) => {
                    const value = e.target.value;
                    if (value < 0.1) e.target.value = 0.1;
                    if (value > 100) e.target.value = 100;
                  },
                })}
                placeholder="e.g., 1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300"
                aria-invalid={errors.serving_size ? "true" : "false"}
                aria-describedby={errors.serving_size ? "serving-size-error" : undefined}
              />
              {errors.serving_size && (
                <p id="serving-size-error" className="mt-1 text-sm text-red-600" role="alert">{errors.serving_size.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="quick-serving-unit" className="block text-sm font-medium text-gray-700">
                Serving Unit *
              </label>
              <Input
                id="quick-serving-unit"
                {...register('serving_unit')}
                placeholder="e.g., serving, piece, g"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300"
                aria-invalid={errors.serving_unit ? "true" : "false"}
                aria-describedby={errors.serving_unit ? "serving-unit-error" : undefined}
              />
              {errors.serving_unit && (
                <p id="serving-unit-error" className="mt-1 text-sm text-red-600" role="alert">{errors.serving_unit.message}</p>
              )}
            </div>

            <Button
              type="submit"
              isLoading={isSubmitting}
              colorScheme="teal"
              variant="solid"
              width="full"
              mt={4}
              bg="brand.300"
              color="white"
              _hover={{ bg: 'brand.400' }}
              isDisabled={!isValid || isSubmitting}
            >
              {isSubmitting ? 'Adding...' : 'Add Food'}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
};

export default QuickAdd;
