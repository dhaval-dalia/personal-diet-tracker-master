// src/components/meal-logging/MealLogger.tsx
// This is the main component for logging meals. It integrates FoodSearch,
// BarcodeScanner, and QuickAdd components, allowing users to add food items
// through various methods and then submit the complete meal log.
// It uses React Hook Form with Zod for overall meal validation.

import React, { useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Input,
  Stack,
  Heading,
  Text,
  IconButton,
  HStack,
  VStack,
  Icon,
  useDisclosure,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Select,
  useTheme,
  useToast,
} from '@chakra-ui/react';
import { FaBarcode, FaSearch, FaTrash, FaPlus } from 'react-icons/fa';
import FoodSearch, { SearchedFoodItem } from './FoodSearch';
import BarcodeScanner, { ScannedFoodItem } from './BarcodeScanner';
import QuickAdd, { QuickAddFoodInputs } from './QuickAdd';
import { mealLogFormSchema } from '../../utils/validation';
import { useMealLogging } from '../../hooks/useMealLogging';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { MealLogData } from '../../services/n8nWebhooks';

// Define the type for the meal log form inputs
type MealLogFormInputs = Omit<MealLogData, 'user_id' | 'created_at'>;

interface FoodItemData {
  id?: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
  barcode?: string;
}

const MealLogger: React.FC = () => {
  const { isLogging, submitMealLog } = useMealLogging();
  const { handleError } = useErrorHandling();
  const { user } = useAuth();
  const theme = useTheme();
  const toast = useToast();

  const { isOpen: isFoodSearchOpen, onOpen: onFoodSearchOpen, onClose: onFoodSearchClose } = useDisclosure();
  const { isOpen: isBarcodeScannerOpen, onOpen: onBarcodeScannerOpen, onClose: onBarcodeScannerClose } = useDisclosure();
  const { isOpen: isQuickAddOpen, onOpen: onQuickAddOpen, onClose: onQuickAddClose } = useDisclosure();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    getValues,
  } = useForm<MealLogFormInputs>({
    resolver: zodResolver(mealLogFormSchema),
    defaultValues: {
      meal_type: 'lunch',
      meal_date: format(new Date(), 'yyyy-MM-dd'),
      meal_time: format(new Date(), 'HH:mm'),
      food_items: [],
      notes: '',
    },
    mode: 'onChange'
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'food_items',
  });

  const handleAddFoodItem = useCallback((food: SearchedFoodItem | ScannedFoodItem | QuickAddFoodInputs) => {
    console.log('Adding food item:', food);
    const foodWithQuantity: FoodItemData = {
      id: 'id' in food ? food.id : undefined,
      name: food.name,
      calories: food.calories_per_serving,
      protein: food.protein_per_serving,
      carbs: food.carbs_per_serving,
      fat: food.fat_per_serving,
      quantity: 'serving_size' in food ? food.serving_size : 1,
      unit: food.serving_unit,
      barcode: food.barcode
    };
    
    const existingIndex = fields.findIndex(item => item.name === food.name && item.unit === food.serving_unit);

    if (existingIndex > -1) {
      const currentQuantity = getValues(`food_items.${existingIndex}.quantity`) || 0;
      setValue(`food_items.${existingIndex}.quantity`, currentQuantity + foodWithQuantity.quantity);
    } else {
      append(foodWithQuantity);
    }
    
    // Close all modals
    onFoodSearchClose();
    onBarcodeScannerClose();
    onQuickAddClose();
  }, [append, fields, getValues, setValue, onFoodSearchClose, onBarcodeScannerClose, onQuickAddClose]);

  const onSubmit = async (data: MealLogFormInputs) => {
    try {
      console.log('MealLogger: Starting form submission');
      console.log('MealLogger: Form data:', JSON.stringify(data, null, 2));

      if (!user?.id) {
        console.error('MealLogger: No user ID found');
        throw new Error('User must be logged in to log meals');
      }

      // Validate food items
      if (!data.food_items || data.food_items.length === 0) {
        console.error('MealLogger: No food items in form data');
        throw new Error('Please add at least one food item');
      }

      // Calculate total nutrition values
      console.log('MealLogger: Calculating total nutrition values');
      const totalNutrition = data.food_items.reduce((acc, item) => ({
        calories: acc.calories + (item.calories * item.quantity),
        protein: acc.protein + (item.protein * item.quantity),
        carbs: acc.carbs + (item.carbs * item.quantity),
        fat: acc.fat + (item.fat * item.quantity)
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      console.log('MealLogger: Calculated nutrition totals:', totalNutrition);

      const mealData = {
        user_id: user.id,
        meal_type: data.meal_type,
        meal_date: data.meal_date,
        meal_time: data.meal_time,
        food_items: data.food_items.map(item => ({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          quantity: item.quantity,
          unit: item.unit,
          barcode: item.barcode
        })),
        notes: data.notes,
        created_at: new Date().toISOString(),
        total_calories: totalNutrition.calories,
        total_protein: totalNutrition.protein,
        total_carbs: totalNutrition.carbs,
        total_fat: totalNutrition.fat,
        source: 'manual'
      };

      console.log('MealLogger: Prepared meal data:', JSON.stringify(mealData, null, 2));
      console.log('MealLogger: Calling submitMealLog');
      const response = await submitMealLog(mealData);
      console.log('MealLogger: Meal log response:', response);

      // Show success message
      toast({
        title: 'Meal logged successfully',
        description: `Added ${data.food_items.length} food items to your ${data.meal_type}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Reset form
      reset({
        meal_type: 'lunch',
        meal_date: format(new Date(), 'yyyy-MM-dd'),
        meal_time: format(new Date(), 'HH:mm'),
        food_items: [],
        notes: '',
      });
    } catch (error) {
      console.error('MealLogger: Error submitting meal:', error);
      handleError(error);
      
      // Show error message
      toast({
        title: 'Error logging meal',
        description: error instanceof Error ? error.message : 'Failed to log meal',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Add a click handler for the submit button
  const handleSubmitClick = () => {
    console.log('MealLogger: Submit button clicked');
    console.log('MealLogger: Current form values:', getValues());
    console.log('MealLogger: Form errors:', errors);
    console.log('MealLogger: Is submitting:', isSubmitting);
    console.log('MealLogger: Number of food items:', fields.length);
  };

  return (
    <Box
      p={8}
      maxWidth="800px"
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
          Log Your Meal
        </Heading>
        <Text fontSize="md" color="text.light" textAlign="center" mb={4}>
          Record what you've eaten to track your nutritional intake.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={4}>
            <HStack gap={4} flexWrap="wrap">
              <FormControl id="meal_type" isInvalid={!!errors.meal_type} flex="1">
                <FormLabel color="text.dark">Meal Type</FormLabel>
                <Select
                  placeholder="Select meal type"
                  {...register('meal_type')}
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                  <option value="other">Other</option>
                </Select>
                <FormErrorMessage>{errors.meal_type?.message}</FormErrorMessage>
              </FormControl>

              <FormControl id="meal_date" isInvalid={!!errors.meal_date} flex="1">
                <FormLabel color="text.dark">Date</FormLabel>
                <Input
                  type="date"
                  {...register('meal_date')}
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                />
                <FormErrorMessage>{errors.meal_date?.message}</FormErrorMessage>
              </FormControl>

              <FormControl id="meal_time" isInvalid={!!errors.meal_time} flex="1">
                <FormLabel color="text.dark">Time</FormLabel>
                <Input
                  type="time"
                  {...register('meal_time')}
                  borderColor="brand.200"
                  _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
                />
                <FormErrorMessage>{errors.meal_time?.message}</FormErrorMessage>
              </FormControl>
            </HStack>

            <Divider my={4} borderColor="brand.100" />

            <Heading as="h3" size="md" color="text.dark">
              Food Items
            </Heading>
            <Text fontSize="sm" color="text.light">
              Add food items to your meal using search, barcode, or quick add.
            </Text>

            <HStack gap={4} justifyContent="center" mb={4}>
              <Button
                type="button"
                onClick={onFoodSearchOpen}
                colorScheme="teal"
                variant="outline"
                bg="brand.100"
                color="text.dark"
                _hover={{ bg: 'brand.200' }}
              >
                <Icon as={FaSearch} mr={2} />
                Search Food
              </Button>
              <Button
                type="button"
                onClick={onBarcodeScannerOpen}
                colorScheme="teal"
                variant="outline"
                bg="brand.100"
                color="text.dark"
                _hover={{ bg: 'brand.200' }}
              >
                <Icon as={FaBarcode} mr={2} />
                Scan Barcode
              </Button>
              <Button
                type="button"
                onClick={onQuickAddOpen}
                colorScheme="teal"
                variant="outline"
                bg="brand.100"
                color="text.dark"
                _hover={{ bg: 'brand.200' }}
              >
                <Icon as={FaPlus} mr={2} />
                Quick Add
              </Button>
            </HStack>

            <VStack gap={3} align="stretch">
              {fields.length === 0 && (
                <Text textAlign="center" color="text.light">No food items added yet.</Text>
              )}
              {fields.map((item, index) => (
                <Box
                  key={item.id}
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  borderColor="brand.200"
                >
                  <HStack justify="space-between">
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="bold">{item.name}</Text>
                      <Text fontSize="sm" color="text.light">
                        {item.calories} kcal | {item.protein}g P | {item.carbs}g C | {item.fat}g F
                      </Text>
                    </VStack>
                    <HStack>
                      <NumberInput
                        size="sm"
                        min={0.1}
                        max={100}
                        step={0.1}
                        value={item.quantity}
                        onChange={(_, value) => setValue(`food_items.${index}.quantity`, value)}
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                      <Text>{item.unit}</Text>
                      <IconButton
                        aria-label="Remove food item"
                        icon={<FaTrash />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => remove(index)}
                      />
                    </HStack>
                  </HStack>
                </Box>
              ))}
            </VStack>

            <FormControl id="notes" isInvalid={!!errors.notes}>
              <FormLabel color="text.dark">Notes</FormLabel>
              <Input
                {...register('notes')}
                placeholder="Add any notes about your meal..."
                borderColor="brand.200"
                _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
              />
              <FormErrorMessage>{errors.notes?.message}</FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              colorScheme="teal"
              size="lg"
              isLoading={isSubmitting}
              loadingText="Logging Meal..."
              width="full"
              mt={4}
              isDisabled={fields.length === 0 || isSubmitting}
              onClick={handleSubmitClick}
            >
              Log Meal
            </Button>
          </Stack>
        </form>
      </Stack>

      <Modal isOpen={isFoodSearchOpen} onClose={onFoodSearchClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Search Food</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FoodSearch onFoodSelect={handleAddFoodItem} />
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isBarcodeScannerOpen} onClose={onBarcodeScannerClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Scan Barcode</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <BarcodeScanner onBarcodeScanned={handleAddFoodItem} />
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isQuickAddOpen} onClose={onQuickAddClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Quick Add Food</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <QuickAdd onQuickAdd={handleAddFoodItem} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default MealLogger;
