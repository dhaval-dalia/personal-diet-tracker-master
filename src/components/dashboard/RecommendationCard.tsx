// src/components/dashboard/RecommendationCard.tsx
import React from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  useColorModeValue,
  Icon,
  HStack
} from '@chakra-ui/react';
import { FaLightbulb, FaArrowRight } from 'react-icons/fa';

type AppView = 'login' | 'signup' | 'onboarding' | 'dashboard' | 'log-meal' | 'profile' | 'goals' | 'preferences';

interface RecommendationCardProps {
  profile?: {
    goal_type?: string;
    weight_kg?: number;
    target_weight?: number;
  };
  goals?: {
    target_calories?: number;
    target_protein_ratio?: number;
    target_carbs_ratio?: number;
    target_fat_ratio?: number;
  };
  mealLogs?: Array<{
    total_calories: number;
    protein: number;
    carbs: number;
    fat: number;
    created_at: string;
  }>;
  onNavigate: (view: AppView) => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  profile,
  goals,
  mealLogs = [],
  onNavigate
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');
  const iconColor = useColorModeValue('teal.500', 'teal.300');

  // Calculate today's totals
  const today = new Date().toISOString().split('T')[0];
  const todayLogs = mealLogs.filter(log => 
    new Date(log.created_at).toISOString().split('T')[0] === today
  );

  const totals = todayLogs.reduce((acc, log) => ({
    calories: acc.calories + (log.total_calories || 0),
    protein: acc.protein + (log.protein || 0),
    carbs: acc.carbs + (log.carbs || 0),
    fat: acc.fat + (log.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Generate recommendations based on data
  const getRecommendations = () => {
    const recommendations = [];

    // Check calorie intake
    if (goals?.target_calories) {
      const calorieDiff = goals.target_calories - totals.calories;
      if (calorieDiff > 500) {
        recommendations.push(`You're ${calorieDiff.toFixed(0)} calories under your daily target. Consider adding a healthy snack.`);
      } else if (calorieDiff < -500) {
        recommendations.push(`You're ${Math.abs(calorieDiff).toFixed(0)} calories over your daily target. Consider adjusting your next meal.`);
      }
    }

    // Check macro ratios
    if (goals?.target_protein_ratio && goals?.target_carbs_ratio && goals?.target_fat_ratio) {
      const totalMacros = totals.protein + totals.carbs + totals.fat;
      const proteinRatio = (totals.protein / totalMacros) * 100;
      const carbsRatio = (totals.carbs / totalMacros) * 100;
      const fatRatio = (totals.fat / totalMacros) * 100;

      if (proteinRatio < goals.target_protein_ratio * 0.8) {
        recommendations.push('Your protein intake is below target. Consider adding more protein-rich foods.');
      }
      if (carbsRatio < goals.target_carbs_ratio * 0.8) {
        recommendations.push('Your carb intake is below target. Consider adding more complex carbohydrates.');
      }
      if (fatRatio < goals.target_fat_ratio * 0.8) {
        recommendations.push('Your fat intake is below target. Consider adding healthy fats to your meals.');
      }
    }

    // Check weight progress
    if (profile?.goal_type && profile?.weight_kg && profile?.target_weight) {
      const weightDiff = profile.target_weight - profile.weight_kg;
      if (profile.goal_type === 'lose_weight' && weightDiff > 0) {
        recommendations.push(`You're ${weightDiff.toFixed(1)} kg away from your weight loss goal. Keep up the good work!`);
      } else if (profile.goal_type === 'gain_weight' && weightDiff < 0) {
        recommendations.push(`You're ${Math.abs(weightDiff).toFixed(1)} kg away from your weight gain goal. Keep up the good work!`);
      }
    }

    return recommendations.length > 0 ? recommendations : ['Keep tracking your meals to get personalized recommendations!'];
  };

  const recommendations = getRecommendations();

  return (
    <Box
      p={6}
      bg={bgColor}
      borderRadius="lg"
      boxShadow="lg"
      borderWidth={1}
      borderColor="gray.200"
    >
      <VStack spacing={4} align="stretch">
        <HStack spacing={3}>
          <Icon as={FaLightbulb} color={iconColor} />
          <Text fontSize="xl" fontWeight="bold" color={textColor}>
            Personalized Recommendations
          </Text>
        </HStack>

        <VStack spacing={3} align="stretch">
          {recommendations.map((recommendation, index) => (
            <Text key={index} color={textColor}>
              {recommendation}
            </Text>
          ))}
        </VStack>

        <Button
          rightIcon={<FaArrowRight />}
          colorScheme="teal"
          variant="outline"
          onClick={() => onNavigate('log-meal')}
          alignSelf="flex-end"
        >
          Log a Meal
        </Button>
      </VStack>
    </Box>
  );
};

export default RecommendationCard;
