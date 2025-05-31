// src/components/meal-logging/QuickAdd.tsx
// This component provides a simplified interface for quickly adding a food item
// with minimal details (e.g., just name and calories). It's designed for speed
// and convenience, then passes the data to the parent for full meal logging.

import React from 'react';
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
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
  });

  const onSubmit = (data: QuickAddFoodInputs) => {
    try {
      onQuickAdd(data);
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

  return (
    <Box p={4} borderRadius="md" bg="whiteAlpha.700" boxShadow="md" borderColor="brand.200" borderWidth={1}>
      <Stack gap={4}>
        <Heading as="h3" size="md" textAlign="center" color="text.dark">
          Quick Add Food
        </Heading>
        <Text fontSize="sm" color="text.light" textAlign="center">
          Quickly add a food item with just a name and calories.
        </Text>

        <Box as="div" onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={3}>
            <div>
              <label htmlFor="quick-name" className="block text-sm font-medium text-gray-700">
                Food Name
              </label>
              <Input
                id="quick-name"
                {...register('name')}
                placeholder="e.g., Apple, Coffee"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="quick-calories" className="block text-sm font-medium text-gray-700">
                Calories (kcal)
              </label>
              <Input
                id="quick-calories"
                type="number"
                min={0}
                max={5000}
                step={1}
                {...register('calories_per_serving', { valueAsNumber: true })}
                placeholder="e.g., 100"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300"
              />
              {errors.calories_per_serving && (
                <p className="mt-1 text-sm text-red-600">{errors.calories_per_serving.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="quick-serving-size" className="block text-sm font-medium text-gray-700">
                Serving Size
              </label>
              <Input
                id="quick-serving-size"
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                {...register('serving_size', { valueAsNumber: true })}
                placeholder="e.g., 1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300"
              />
              {errors.serving_size && (
                <p className="mt-1 text-sm text-red-600">{errors.serving_size.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="quick-serving-unit" className="block text-sm font-medium text-gray-700">
                Serving Unit
              </label>
              <Input
                id="quick-serving-unit"
                {...register('serving_unit')}
                placeholder="e.g., serving, piece, g"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-300 focus:ring-brand-300"
              />
              {errors.serving_unit && (
                <p className="mt-1 text-sm text-red-600">{errors.serving_unit.message}</p>
              )}
            </div>

            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
              colorScheme="teal"
              variant="solid"
              width="full"
              mt={4}
              bg="brand.300"
              color="white"
              _hover={{ bg: 'brand.400' }}
            >
              {isSubmitting ? 'Adding...' : 'Add Food'}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default QuickAdd;
