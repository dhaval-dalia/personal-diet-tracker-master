// src/components/meal-logging/FoodSearch.tsx
// This component allows users to search for food items, either from a local database
// (e.g., Supabase) or an external nutrition API. It displays search results
// and allows users to select a food item to add to their meal log.

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Input,
  Button,
  VStack,
  Text,
  HStack,
  Spinner,
  InputGroup,
  InputRightElement,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  SimpleGrid,
  Stack,
  Heading,
  Divider,
} from '@chakra-ui/react';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { supabase } from '../../services/supabase';
import { CloseIcon, SearchIcon } from '@chakra-ui/icons';
import { useAuth } from '../../hooks/useAuth';

// Define a basic type for a food item from search results
export interface SearchedFoodItem {
  id: string;
  name: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  serving_size: number;
  serving_unit: string;
  barcode?: string;
}

interface PreviousFoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
  meal_log_id: string;
  meal_type: string;
  meal_date: string;
  created_at?: string;
}

interface FoodSearchProps {
  onFoodSelect: (food: SearchedFoodItem) => void;
}

const FoodSearch: React.FC<FoodSearchProps> = ({ onFoodSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedFoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previousFoodItems, setPreviousFoodItems] = useState<PreviousFoodItem[]>([]);
  const [selectedFoodItem, setSelectedFoodItem] = useState<PreviousFoodItem | null>(null);
  const [servingSize, setServingSize] = useState(1);
  const [mealType, setMealType] = useState('breakfast');
  const { handleError } = useErrorHandling();
  const { user } = useAuth();
  const toast = useToast();

  // Fetch previous food items from meal_food_items table with meal_logs data
  useEffect(() => {
    const fetchPreviousFoodItems = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('meal_food_items')
          .select(`
            id,
            name,
            calories,
            protein,
            carbs,
            fat,
            quantity,
            unit,
            meal_log_id,
            meal_logs (
              meal_type,
              meal_date,
              created_at
            )
          `)
          .eq('user_id', user.id)
          .order('meal_logs.created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        
        // Transform the data and remove duplicates based on food name
        const transformedData = data?.map(item => ({
          id: item.id,
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          quantity: item.quantity,
          unit: item.unit,
          meal_log_id: item.meal_log_id,
          meal_type: item.meal_logs?.[0]?.meal_type || 'breakfast',
          meal_date: item.meal_logs?.[0]?.meal_date || new Date().toISOString(),
          created_at: item.meal_logs?.[0]?.created_at || new Date().toISOString()
        })) || [];

        // Remove duplicates based on food name and keep the most recent
        const uniqueFoodItems = transformedData.reduce((acc: PreviousFoodItem[], current) => {
          const existingItem = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
          if (!existingItem) {
            acc.push(current);
          }
          return acc;
        }, []);

        setPreviousFoodItems(uniqueFoodItems);
      } catch (err) {
        handleError(err, 'Failed to fetch previous food items');
      }
    };

    fetchPreviousFoodItems();
  }, [user?.id, handleError]);

  const handleFoodItemSelect = (foodItemId: string) => {
    const foodItem = previousFoodItems.find(item => item.id === foodItemId);
    if (foodItem) {
      setSelectedFoodItem(foodItem);
      setServingSize(1);
      setMealType(foodItem.meal_type); // Set meal type from previous log
    }
  };

  const handleConfirmFoodItem = () => {
    if (!selectedFoodItem) return;

    const adjustedFoodItem: SearchedFoodItem = {
      id: selectedFoodItem.id,
      name: selectedFoodItem.name,
      calories_per_serving: selectedFoodItem.calories * servingSize,
      protein_per_serving: selectedFoodItem.protein * servingSize,
      carbs_per_serving: selectedFoodItem.carbs * servingSize,
      fat_per_serving: selectedFoodItem.fat * servingSize,
      serving_size: selectedFoodItem.quantity * servingSize,
      serving_unit: selectedFoodItem.unit
    };

    onFoodSelect(adjustedFoodItem);
    setSelectedFoodItem(null);
    setServingSize(1);
    setMealType('breakfast');
    
    toast({
      title: "Food added",
      description: `${adjustedFoodItem.name} has been added to your ${mealType} log`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase
        .from('meal_food_items')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      // Transform the data to match SearchedFoodItem interface
      const transformedResults: SearchedFoodItem[] = data?.map(item => ({
        id: item.id,
        name: item.name,
        calories_per_serving: item.calories,
        protein_per_serving: item.protein,
        carbs_per_serving: item.carbs,
        fat_per_serving: item.fat,
        serving_size: item.quantity,
        serving_unit: item.unit,
        barcode: item.barcode
      })) || [];

      setSearchResults(transformedResults);
      // Reset selected food item when searching
      setSelectedFoodItem(null);
      setServingSize(1);
      setMealType('breakfast');
    } catch (err) {
      handleError(err, 'Failed to search food items');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, handleError]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSelectedFoodItem(null);
    setServingSize(1);
    setMealType('breakfast');
  };

  const handleFoodSelect = (food: SearchedFoodItem) => {
    onFoodSelect(food);
    // Reset form after selection
    setSearchTerm('');
    setSearchResults([]);
    setSelectedFoodItem(null);
    setServingSize(1);
    setMealType('breakfast');
  };

  return (
    <Box
      p={4}
      borderRadius="md"
      bg="whiteAlpha.700"
      boxShadow="md"
      borderColor="brand.200"
      borderWidth={1}
    >
      <Text fontSize="lg" fontWeight="bold" mb={4} color="text.dark">
        Search for Food
      </Text>

      <VStack spacing={6} align="stretch">
        {/* Previous Food Items Section */}
        <Box>
          <Heading as="h3" size="md" mb={3} color="text.dark">
            Select from Previous Meals
          </Heading>
          
          <VStack spacing={4} align="stretch">
            <Box>
              <Text mb={2} fontSize="sm" color="text.dark">Food Item</Text>
              <Select
                placeholder="Select from your previous logged meals"
                value={selectedFoodItem?.id || ''}
                onChange={(e) => handleFoodItemSelect(e.target.value)}
                borderColor="brand.200"
                _focus={{
                  borderColor: 'brand.300',
                  boxShadow: '0 0 0 1px var(--chakra-colors-brand-300)',
                }}
              >
                {previousFoodItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.quantity} {item.unit} - {item.calories} kcal) - {item.meal_type} on {new Date(item.meal_date).toLocaleDateString()}
                  </option>
                ))}
              </Select>
            </Box>

            {selectedFoodItem && (
              <Box
                p={4}
                borderRadius="md"
                bg="whiteAlpha.700"
                boxShadow="md"
                borderColor="brand.200"
                borderWidth={1}
              >
                <Stack spacing={4}>
                  <Text fontWeight="bold" color="text.dark" fontSize="lg">
                    {selectedFoodItem.name}
                  </Text>
                  
                  <SimpleGrid columns={2} spacing={4}>
                    <Box>
                      <Text mb={2} fontSize="sm" color="text.dark">Serving Size</Text>
                      <NumberInput
                        value={servingSize}
                        onChange={(_, value) => setServingSize(value)}
                        min={0.1}
                        step={0.1}
                        precision={1}
                      >
                        <NumberInputField 
                          borderColor="brand.200"
                          _focus={{
                            borderColor: 'brand.300',
                            boxShadow: '0 0 0 1px var(--chakra-colors-brand-300)',
                          }}
                        />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </Box>

                    <Box>
                      <Text mb={2} fontSize="sm" color="text.dark">Meal Type</Text>
                      <Select
                        value={mealType}
                        onChange={(e) => setMealType(e.target.value)}
                        borderColor="brand.200"
                        _focus={{
                          borderColor: 'brand.300',
                          boxShadow: '0 0 0 1px var(--chakra-colors-brand-300)',
                        }}
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snack">Snack</option>
                      </Select>
                    </Box>
                  </SimpleGrid>

                  <SimpleGrid columns={2} spacing={4}>
                    <Box>
                      <Text fontSize="sm" color="text.dark">Calories</Text>
                      <Text fontWeight="bold" color="text.dark">
                        {(selectedFoodItem.calories * servingSize).toFixed(1)} kcal
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="text.dark">Protein</Text>
                      <Text fontWeight="bold" color="text.dark">
                        {(selectedFoodItem.protein * servingSize).toFixed(1)}g
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="text.dark">Carbs</Text>
                      <Text fontWeight="bold" color="text.dark">
                        {(selectedFoodItem.carbs * servingSize).toFixed(1)}g
                      </Text>
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="text.dark">Fat</Text>
                      <Text fontWeight="bold" color="text.dark">
                        {(selectedFoodItem.fat * servingSize).toFixed(1)}g
                      </Text>
                    </Box>
                  </SimpleGrid>

                  <Text fontSize="sm" color="text.light">
                    Serving: {(selectedFoodItem.quantity * servingSize).toFixed(1)} {selectedFoodItem.unit}
                  </Text>

                  <Button
                    colorScheme="teal"
                    onClick={handleConfirmFoodItem}
                    width="full"
                    mt={2}
                    bg="brand.300"
                    color="white"
                    _hover={{ bg: 'brand.400' }}
                  >
                    Add to {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Log
                  </Button>
                </Stack>
              </Box>
            )}
          </VStack>
        </Box>

        <Divider borderColor="brand.200" />

        {/* Search Section */}
        <Box>
          <Heading as="h3" size="md" mb={3} color="text.dark">
            Search New Food Items
          </Heading>
          
          <VStack spacing={4} align="stretch">
            <InputGroup>
              <Box position="relative" width="100%">
                <Input
                  placeholder="Search for food (e.g., 'apple', 'chicken breast')"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  borderColor="brand.200"
                  _focus={{
                    borderColor: 'brand.300',
                    boxShadow: '0 0 0 1px var(--chakra-colors-brand-300)',
                  }}
                />
                <InputRightElement width="4.5rem">
                  {searchTerm ? (
                    <Button
                      aria-label="Clear search"
                      onClick={handleClearSearch}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                    >
                      <CloseIcon />
                    </Button>
                  ) : (
                    <Button
                      aria-label="Search food"
                      onClick={handleSearch}
                      size="sm"
                      variant="ghost"
                      colorScheme="teal"
                    >
                      <SearchIcon />
                    </Button>
                  )}
                </InputRightElement>
              </Box>
            </InputGroup>

            <Button
              onClick={handleSearch}
              isLoading={isLoading}
              colorScheme="teal"
              variant="solid"
              width="full"
              bg="accent.100"
              color="text.dark"
              _hover={{ bg: 'accent.200' }}
            >
              Search
            </Button>

            {isLoading && (
              <Box mt={4} textAlign="center">
                <Spinner size="sm" color="teal.500" />
                <Text mt={2} color="text.light">Searching...</Text>
              </Box>
            )}

            {searchResults.length > 0 && (
              <VStack gap={2} mt={4} align="stretch">
                <Text fontSize="md" fontWeight="semibold" color="text.dark">
                  Search Results:
                </Text>
                {searchResults.map((food) => (
                  <HStack
                    key={food.id}
                    p={3}
                    borderRadius="md"
                    bg="brand.50"
                    _hover={{ bg: 'brand.100', cursor: 'pointer' }}
                    onClick={() => handleFoodSelect(food)}
                    justifyContent="space-between"
                  >
                    <Box>
                      <Text fontWeight="bold" color="text.dark">{food.name}</Text>
                      <Text fontSize="sm" color="text.light">
                        {food.calories_per_serving} kcal | {food.protein_per_serving}g P | {food.carbs_per_serving}g C | {food.fat_per_serving}g F
                        {food.serving_unit && ` (per ${food.serving_size} ${food.serving_unit})`}
                      </Text>
                    </Box>
                    <Button size="sm" variant="outline" colorScheme="teal" onClick={() => handleFoodSelect(food)}>
                      Add
                    </Button>
                  </HStack>
                ))}
              </VStack>
            )}

            {!isLoading && searchResults.length === 0 && searchTerm.trim() && (
              <Text mt={4} color="text.light" textAlign="center">
                No food items found. Try a different search term.
              </Text>
            )}
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default FoodSearch;
