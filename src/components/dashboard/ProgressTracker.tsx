// src/components/dashboard/ProgressTracker.tsx
import React from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Icon,
  Divider,
  Progress,
  useColorModeValue
} from '@chakra-ui/react';
import { FaWeight, FaFire } from 'react-icons/fa';

interface ProgressTrackerProps {
  profile?: {
    weight_kg?: number;
    target_weight?: number;
    goal_type?: string;
  };
  goals?: {
    target_calories?: number;
    target_weight_kg?: number;
  };
  mealLogs?: Array<{
    total_calories: number;
    created_at: string;
  }>;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ 
  profile,
  goals,
  mealLogs = []
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const progressColor = useColorModeValue('teal.500', 'teal.300');

  // Calculate current weight and target weight
  const currentWeight = profile?.weight_kg || 0;
  const targetWeight = goals?.target_weight_kg || profile?.target_weight || 0;
  const goalType = profile?.goal_type || 'maintain';

  // Calculate weight progress
  const calculateWeightProgress = () => {
    if (!currentWeight || !targetWeight) return 0;
    if (goalType === 'lose_weight') {
      const startWeight = Math.max(currentWeight, targetWeight);
      const progress = ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100;
      return Math.min(Math.max(progress, 0), 100);
    } else if (goalType === 'gain_weight') {
      const startWeight = Math.min(currentWeight, targetWeight);
      const progress = ((currentWeight - startWeight) / (targetWeight - startWeight)) * 100;
      return Math.min(Math.max(progress, 0), 100);
    }
    return 0;
  };

  // Calculate calorie target progress
  const calculateCalorieProgress = () => {
    if (!mealLogs.length || !goals?.target_calories) return 0;
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = mealLogs.filter(log => 
      new Date(log.created_at).toISOString().split('T')[0] === today
    );
    const totalCalories = todayLogs.reduce((sum, log) => sum + (log.total_calories || 0), 0);
    const progress = (totalCalories / goals.target_calories) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const weightProgress = calculateWeightProgress();
  const calorieProgress = calculateCalorieProgress();

  return (
    <VStack spacing={6} align="stretch">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {/* Weight Progress */}
        <Box p={4} bg={bgColor} borderRadius="md" boxShadow="sm">
          <HStack spacing={3} mb={4}>
            <Icon as={FaWeight} color={progressColor} />
            <Text fontWeight="semibold" color={textColor}>Weight Progress</Text>
          </HStack>
          <VStack align="stretch" spacing={2}>
            <Text color={textColor}>
              Current: {currentWeight} kg
            </Text>
            <Text color={textColor}>
              Target: {targetWeight} kg
            </Text>
            <Progress 
              value={weightProgress} 
              size="sm" 
              colorScheme="teal" 
              borderRadius="md"
            />
            <Text fontSize="sm" color={textColor}>
              {weightProgress.toFixed(1)}% towards your weight goal
            </Text>
          </VStack>
        </Box>

        {/* Calorie Progress */}
        <Box p={4} bg={bgColor} borderRadius="md" boxShadow="sm">
          <HStack spacing={3} mb={4}>
            <Icon as={FaFire} color={progressColor} />
            <Text fontWeight="semibold" color={textColor}>Today's Calories</Text>
          </HStack>
          <VStack align="stretch" spacing={2}>
            <Text color={textColor}>
              Target: {goals?.target_calories || 0} kcal
            </Text>
            <Progress 
              value={calorieProgress} 
              size="sm" 
              colorScheme="teal" 
              borderRadius="md"
            />
            <Text fontSize="sm" color={textColor}>
              {calorieProgress.toFixed(1)}% of daily calorie goal
            </Text>
          </VStack>
        </Box>
      </SimpleGrid>

      <Divider borderColor="gray.200" />

      {/* Goal Summary */}
      <Box>
        <Text fontWeight="semibold" color={textColor} mb={2}>Goal Summary</Text>
        <VStack align="stretch" spacing={2}>
          <Text color={textColor}>
            Goal Type: {goalType.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ')}
          </Text>
          <Text color={textColor}>
            Daily Calorie Target: {goals?.target_calories || 0} kcal
          </Text>
          <Text color={textColor}>
            Target Weight: {targetWeight} kg
          </Text>
        </VStack>
      </Box>
    </VStack>
  );
};

export default ProgressTracker;
