// src/components/meal-logging/FoodSearch.tsx
// This component allows users to search for food items, either from a local database
// (e.g., Supabase) or an external nutrition API. It displays search results
// and allows users to select a food item to add to their meal log.

import React, { useState, useCallback } from 'react';
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
} from '@chakra-ui/react';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { supabase } from '../../services/supabase';
import { CloseIcon, SearchIcon } from '@chakra-ui/icons';

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

interface FoodSearchProps {
  onFoodSelect: (food: SearchedFoodItem) => void;
}

const FoodSearch: React.FC<FoodSearchProps> = ({ onFoodSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedFoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { handleError } = useErrorHandling();

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setSearchResults([]);
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('id, name, calories_per_serving, protein_per_serving, carbs_per_serving, fat_per_serving, serving_size, serving_unit, barcode')
        .ilike('name', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
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
        mt={3}
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
              onClick={() => onFoodSelect(food)}
              justifyContent="space-between"
            >
              <Box>
                <Text fontWeight="bold" color="text.dark">{food.name}</Text>
                <Text fontSize="sm" color="text.light">
                  {food.calories_per_serving} kcal | {food.protein_per_serving}g P | {food.carbs_per_serving}g C | {food.fat_per_serving}g F
                  {food.serving_unit && ` (per ${food.serving_size} ${food.serving_unit})`}
                </Text>
              </Box>
              <Button size="sm" variant="outline" colorScheme="teal" onClick={() => onFoodSelect(food)}>
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
    </Box>
  );
};

export default FoodSearch;
