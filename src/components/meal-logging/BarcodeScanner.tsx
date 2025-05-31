// src/components/meal-logging/BarcodeScanner.tsx
// This component provides a barcode scanning interface using react-zxing.
// It allows users to scan barcodes with their webcam to quickly identify food items.
// It handles camera permissions and provides visual feedback.

import React, { useState } from 'react';
import { useZxing } from 'react-zxing';
import { Box, Button, Text, VStack, Center, Icon, Heading } from '@chakra-ui/react';
import { FaBarcode, FaLightbulb, FaRegLightbulb } from 'react-icons/fa';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { supabase } from '../../services/supabase';

// Define a basic type for a food item from search results
export interface ScannedFoodItem {
  id: string;
  name: string;
  calories_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  serving_size: number;
  serving_unit: string;
  barcode: string;
}

interface BarcodeScannerProps {
  onBarcodeScanned: (food: ScannedFoodItem) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onBarcodeScanned }) => {
  const [result, setResult] = useState('');
  const { showToast, handleError } = useErrorHandling();

  const { ref, torch: { on, off, isOn, isAvailable } } = useZxing({
    onDecodeResult(decodedResult) {
      const barcode = decodedResult.getText();
      setResult(barcode);
      
      // Look up the food item in the database
      const lookupFoodItem = async () => {
        try {
          const { data, error } = await supabase
            .from('food_items')
            .select('*')
            .eq('barcode', barcode)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              // No food item found with this barcode
              showToast({
                title: 'Food Not Found',
                description: 'This barcode is not in our database. You can add it manually.',
                status: 'warning',
              });
            } else {
              throw error;
            }
          } else if (data) {
            onBarcodeScanned(data as ScannedFoodItem);
            showToast({
              title: 'Food Found!',
              description: `Found: ${data.name}`,
              status: 'success',
            });
          }
        } catch (error: unknown) {
          handleError(error, 'Failed to look up food item');
        }
      };

      lookupFoodItem();
    },
    onDecodeError(error) {
      // Silent handling of decode errors
    },
    onError(error: unknown) {
      const errorMessage = error instanceof Error && error.name === 'NotAllowedError'
        ? 'Please grant camera permissions to use the barcode scanner.'
        : 'Could not access camera. Ensure no other application is using it.';
      handleError(error, errorMessage);
    },
    constraints: {
      video: { facingMode: 'environment' },
      audio: false,
    },
  });

  return (
    <Box p={4} borderRadius="lg" bg="whiteAlpha.800" boxShadow="xl" textAlign="center" borderColor="brand.200" borderWidth={1}>
      <VStack gap={4}>
        <Heading as="h3" size="lg" color="text.dark">
          <Icon as={FaBarcode} mr={2} color="accent.500" />Scan a Barcode
        </Heading>
        <Text fontSize="md" color="text.light">
          Point your camera at a product barcode.
        </Text>

        <Center
          w="100%"
          maxW="500px"
          h="300px"
          bg="gray.100"
          borderRadius="md"
          overflow="hidden"
          position="relative"
        >
          <video
            ref={ref as React.RefObject<HTMLVideoElement>}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)'
            }}
          />
          <Box
            position="absolute"
            top="10%"
            left="10%"
            width="80%"
            height="80%"
            border="2px dashed"
            borderColor="accent.500"
            borderRadius="md"
            pointerEvents="none"
          />
        </Center>

        {isAvailable && (
          <Button
            onClick={() => (isOn ? off() : on())}
            colorScheme="teal"
            variant="outline"
            bg="brand.100"
            color="text.dark"
            _hover={{ bg: 'brand.200' }}
          >
            {isOn ? (
              <>
                <FaRegLightbulb /> Turn Off Flashlight
              </>
            ) : (
              <>
                <FaLightbulb /> Turn On Flashlight
              </>
            )}
          </Button>
        )}

        {result && (
          <Text mt={2} fontSize="md" color="text.dark">
            Last Scanned: <Text as="span" fontWeight="bold" color="accent.600">{result}</Text>
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default BarcodeScanner;
