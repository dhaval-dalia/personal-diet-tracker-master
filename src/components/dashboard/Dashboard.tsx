'use client';
import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  SimpleGrid,
  useColorModeValue,
  Spinner,
  Center,
  useToast,
  HStack,
  Input,
  Progress,
  Card,
  CardBody,
  CardHeader,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';
import DailyOverview from './DailyOverview';
import NutritionChart from './NutritionChart';
import ProgressTracker from './ProgressTracker';
import RecommendationCard from './RecommendationCard';
import MacroPieChart from './MacroPieChart';
import { User } from '@supabase/supabase-js';

interface DashboardData {
  profile: {
    full_name: string;
    weight_kg: number;
    target_weight: number;
    goal_type: string;
  };
  goals: {
    target_calories: number;
    target_protein_ratio: number;
    target_carbs_ratio: number;
    target_fat_ratio: number;
    target_weight_kg: number;
  };
  mealLogs: Array<{
    total_calories: number;
    protein: number;
    carbs: number;
    fat: number;
    created_at: string;
  }>;
  nutritionLogs: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }>;
}

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface UserGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface WeightLog {
  id: string;
  user_id: string;
  weight: number;
  created_at: string;
}

console.log('Dashboard component rendered on client');

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [nutritionData, setNutritionData] = useState<NutritionData>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [goals, setGoals] = useState<UserGoals>({
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 70,
  });
  const [weight, setWeight] = useState('');
  const [weightHistory, setWeightHistory] = useState<WeightLog[]>([]);
  const [todayCalories, setTodayCalories] = useState('');
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has completed onboarding
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          setIsLoading(false);
          return;
        }

        // Check if all required fields are filled
        const requiredFields = ['full_name', 'weight_kg', 'height_cm', 'goal_type'];
        const isComplete = requiredFields.every(field => profile[field]);

        setIsOnboardingComplete(isComplete);

        if (isComplete) {
          // Fetch all necessary data for the dashboard
          const [goalsResponse, mealLogsResponse, nutritionLogsResponse] = await Promise.all([
            supabase
              .from('user_goals')
              .select('*')
              .eq('user_id', user.id)
              .single(),
            supabase
              .from('meal_logs')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(30),
            supabase
              .from('nutrition_logs')
              .select('*')
              .eq('user_id', user.id)
              .order('date', { ascending: false })
              .limit(30)
          ]);

          if (goalsResponse.error) throw goalsResponse.error;
          if (mealLogsResponse.error) throw mealLogsResponse.error;
          if (nutritionLogsResponse.error) throw nutritionLogsResponse.error;

          setDashboardData({
            profile,
            goals: goalsResponse.data,
            mealLogs: mealLogsResponse.data,
            nutritionLogs: nutritionLogsResponse.data
          });
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user?.id, toast]);

  useEffect(() => {
    if (user?.id) {
      fetchUserData();
      fetchWeightHistory();
      generateRecommendations();
    }
  }, [user?.id]);

  const fetchUserData = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch today's meals using meal_date
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      const { data: meals, error: mealsError } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('meal_date', today);
      console.log('Fetched meals:', meals, mealsError);

      if (mealsError) throw mealsError;

      // Calculate nutrition data from meals (use total_* fields)
      const nutrition = meals.reduce((acc, meal) => ({
        calories: acc.calories + (meal.total_calories || 0),
        protein: acc.protein + (meal.total_protein || 0),
        carbs: acc.carbs + (meal.total_carbs || 0),
        fat: acc.fat + (meal.total_fat || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      console.log('Calculated nutrition:', nutrition);
      setNutritionData(nutrition);

      // Fetch user goals
      const { data: userGoals, error: goalsError } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (goalsError) throw goalsError;
      if (userGoals) {
        const mappedGoals = {
          calories: userGoals.target_calories,
          protein: (parseFloat(userGoals.target_protein_ratio) / 100) * userGoals.target_calories / 4,
          carbs: (parseFloat(userGoals.target_carbs_ratio) / 100) * userGoals.target_calories / 4,
          fat: (parseFloat(userGoals.target_fat_ratio) / 100) * userGoals.target_calories / 9,
        };
        console.log('Mapped goals:', mappedGoals);
        setGoals(mappedGoals);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user data',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const fetchWeightHistory = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWeightHistory(data && data.length > 0 ? data : []);
    } catch (error) {
      console.error('Error fetching weight history:', error);
      setWeightHistory([]); // fallback to empty
    }
  };

  const handleWeightSubmit = async () => {
    if (!user?.id || !weight) return;

    try {
      const { error } = await supabase
        .from('weight_logs')
        .insert([
          {
            user_id: user.id,
            weight: parseFloat(weight),
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Weight logged successfully',
        status: 'success',
        duration: 3000,
      });

      setWeight('');
      fetchWeightHistory();
    } catch (error) {
      console.error('Error logging weight:', error);
      toast({
        title: 'Error',
        description: 'Failed to log weight',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleCaloriesSubmit = async () => {
    if (!user?.id || !todayCalories) return;

    try {
      const { error } = await supabase
        .from('meal_logs')
        .insert([
          {
            user_id: user.id,
            calories: parseInt(todayCalories),
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Calories logged successfully',
        status: 'success',
        duration: 3000,
      });

      setTodayCalories('');
      fetchUserData();
    } catch (error) {
      console.error('Error logging calories:', error);
      toast({
        title: 'Error',
        description: 'Failed to log calories',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const generateRecommendations = () => {
    const recs: string[] = [];
    
    // Nutrition recommendations
    const caloriePercentage = (nutritionData.calories / goals.calories) * 100;
    if (caloriePercentage < 80) {
      recs.push('You\'re below your calorie goal. Consider adding a healthy snack.');
    } else if (caloriePercentage > 120) {
      recs.push('You\'re above your calorie goal. Consider lighter options for your next meal.');
    }

    // Weight recommendations
    if (weightHistory.length > 0) {
      const latestWeight = weightHistory[0].weight;
      const previousWeight = weightHistory[1]?.weight;
      if (previousWeight && latestWeight > previousWeight) {
        recs.push('Your weight has increased. Consider reviewing your calorie intake.');
      }
    }

    setRecommendations(recs);
  };

  const handleNavigate = (view: string) => {
    router.push(`/${view}`);
  };

  // Debug: log nutritionData before render
  console.log('nutritionData before render:', nutritionData);

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="brand.500" />
      </Center>
    );
  }

  if (!user) {
    return (
      <Box p={8}>
        <VStack spacing={8} align="stretch">
          <Box
            p={8}
            bg="white"
            borderRadius="lg"
            boxShadow="lg"
            borderWidth={1}
            borderColor="brand.200"
          >
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" color="brand.500">
                Welcome to Your Diet Tracker!
              </Heading>
              <Text fontSize="lg" color="gray.600" textAlign="center">
                Please sign in to access your dashboard.
              </Text>
              <Button
                colorScheme="brand"
                size="lg"
                width="full"
                onClick={() => router.push('/login')}
              >
                Sign In
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Box>
    );
  }

  if (!isOnboardingComplete) {
    return (
      <Box p={8}>
        <VStack spacing={8} align="stretch">
          <Box
            p={8}
            bg="white"
            borderRadius="lg"
            boxShadow="lg"
            borderWidth={1}
            borderColor="brand.200"
          >
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" color="brand.500">
                Complete Your Profile
              </Heading>
              <Text fontSize="lg" color="gray.600" textAlign="center">
                To get started with personalized tracking and recommendations, please complete your profile setup.
              </Text>
              <Button
                colorScheme="brand"
                size="lg"
                width="full"
                onClick={() => router.push('/onboarding')}
              >
                Start Onboarding
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Box>
    );
  }

  if (!dashboardData) {
    return (
      <Box p={8}>
        <VStack spacing={8} align="stretch">
          <Box
            p={8}
            bg="white"
            borderRadius="lg"
            boxShadow="lg"
            borderWidth={1}
            borderColor="brand.200"
          >
            <VStack spacing={6} align="stretch">
              <Heading size="xl" textAlign="center" color="brand.500">
                Welcome to Your Dashboard!
              </Heading>
              <Text fontSize="lg" color="gray.600" textAlign="center">
                Start tracking your nutrition and fitness journey.
              </Text>
              <Button
                colorScheme="brand"
                size="lg"
                width="full"
                onClick={() => router.push('/log-meal')}
              >
                Log Your First Meal
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Box>
    );
  }

  // In the render section, fallback to user_profiles for weight if weightHistory is empty
  const currentWeight = weightHistory.length > 0 ? weightHistory[0].weight : (dashboardData?.profile?.weight_kg || 0);
  const targetWeight = dashboardData?.profile?.target_weight || 0;

  return (
    <VStack spacing={8} align="stretch" p={4}>
      {/* Nutrition Progress Section */}
      <Card>
        <CardHeader>
          <Heading size="md">Nutrition Progress</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Box>
              <Text mb={2}>Calories</Text>
              <Progress
                value={(nutritionData.calories / goals.calories) * 100}
                colorScheme="blue"
                size="lg"
              />
              <Text mt={1}>
                {nutritionData.calories} / {goals.calories} kcal
              </Text>
            </Box>
            <Box>
              <Text mb={2}>Protein</Text>
              <Progress
                value={(nutritionData.protein / goals.protein) * 100}
                colorScheme="green"
                size="lg"
              />
              <Text mt={1}>
                {nutritionData.protein}g / {goals.protein}g
              </Text>
            </Box>
            <Box>
              <Text mb={2}>Carbs</Text>
              <Progress
                value={(nutritionData.carbs / goals.carbs) * 100}
                colorScheme="yellow"
                size="lg"
              />
              <Text mt={1}>
                {nutritionData.carbs}g / {goals.carbs}g
              </Text>
            </Box>
            <Box>
              <Text mb={2}>Fat</Text>
              <Progress
                value={(nutritionData.fat / goals.fat) * 100}
                colorScheme="red"
                size="lg"
              />
              <Text mt={1}>
                {nutritionData.fat}g / {goals.fat}g
              </Text>
            </Box>
          </VStack>
        </CardBody>
      </Card>

      {/* Weight Progress Section */}
      <Card>
        <CardHeader>
          <Heading size="md">Weight Progress</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <HStack>
              <Input
                placeholder="Enter weight (kg)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                type="number"
              />
              <Button colorScheme="blue" onClick={handleWeightSubmit}>
                Log Weight
              </Button>
            </HStack>
            {weightHistory.length > 0 && (
              <Stat>
                <StatLabel>Current Weight</StatLabel>
                <StatNumber>{currentWeight} kg</StatNumber>
                {weightHistory.length > 1 && (
                  <StatHelpText>
                    <StatArrow
                      type={
                        currentWeight > weightHistory[1].weight
                          ? 'increase'
                          : 'decrease'
                      }
                    />
                    {Math.abs(
                      currentWeight - weightHistory[1].weight
                    ).toFixed(1)}{' '}
                    kg from last record
                  </StatHelpText>
                )}
              </Stat>
            )}
          </VStack>
        </CardBody>
      </Card>

      {/* Today's Calories Section */}
      <Card>
        <CardHeader>
          <Heading size="md">Today's Calories</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4}>
            <HStack>
              <Input
                placeholder="Enter calories"
                value={todayCalories}
                onChange={(e) => setTodayCalories(e.target.value)}
                type="number"
              />
              <Button colorScheme="blue" onClick={handleCaloriesSubmit}>
                Log Calories
              </Button>
            </HStack>
            <Text>Total calories today: {nutritionData.calories} kcal</Text>
          </VStack>
        </CardBody>
      </Card>

      {/* Summary Section */}
      <Card>
        <CardHeader>
          <Heading size="md">Summary</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={2} spacing={4}>
            <Stat>
              <StatLabel>Daily Progress</StatLabel>
              <StatNumber>
                {((nutritionData.calories / goals.calories) * 100).toFixed(1)}%
              </StatNumber>
              <StatHelpText>of daily calorie goal</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Macro Balance</StatLabel>
              <StatNumber>
                {((nutritionData.protein + nutritionData.carbs + nutritionData.fat) /
                  (goals.protein + goals.carbs + goals.fat) *
                  100).toFixed(1)}%
              </StatNumber>
              <StatHelpText>of macro goals</StatHelpText>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Recommendations Section */}
      <Card>
        <CardHeader>
          <Heading size="md">Recommendations</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={2} align="stretch">
            {recommendations.length > 0 ? (
              recommendations.map((rec, index) => (
                <Text key={index}>• {rec}</Text>
              ))
            ) : (
              <Text>Keep up the good work! No specific recommendations at this time.</Text>
            )}
          </VStack>
        </CardBody>
      </Card>
    </VStack>
  );
};

export default Dashboard;
