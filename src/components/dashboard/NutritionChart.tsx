// src/components/dashboard/NutritionChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Heading, Text, useTheme, useColorModeValue } from '@chakra-ui/react';

type AppView = 'login' | 'signup' | 'onboarding' | 'dashboard' | 'log-meal' | 'profile' | 'goals' | 'preferences';

interface DailyNutritionData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface NutritionChartProps {
  title?: string;
  onNavigate: (view: AppView) => void;
  data?: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }>;
  goals?: {
    target_calories?: number;
    target_protein_ratio?: number;
    target_carbs_ratio?: number;
    target_fat_ratio?: number;
  };
}

const NutritionChart: React.FC<NutritionChartProps> = ({ 
  title = "Nutritional Intake Over Time",
  onNavigate,
  data = [],
  goals
}) => {
  const theme = useTheme();
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  // Calculate percentages based on user goals or default targets
  const TARGETS = {
    calories: goals?.target_calories || 2000,
    protein: goals?.target_protein_ratio || 150,
    carbs: goals?.target_carbs_ratio || 250,
    fat: goals?.target_fat_ratio || 65,
    fiber: 30 // Default fiber target
  };

  // Process data to show percentages of targets
  const processedData = data.map(item => ({
    date: item.date,
    calories: (item.calories / TARGETS.calories) * 100,
    protein: (item.protein / TARGETS.protein) * 100,
    carbs: (item.carbs / TARGETS.carbs) * 100,
    fat: (item.fat / TARGETS.fat) * 100,
    fiber: (item.fiber / TARGETS.fiber) * 100
  }));

  // Colors for each nutrient
  const colors = {
    calories: theme.colors.accent['500'],
    protein: theme.colors.brand['500'],
    carbs: theme.colors.blue['400'],
    fat: theme.colors.yellow['500'],
    fiber: theme.colors.green['500']
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box
          bg="white"
          p={3}
          borderRadius="md"
          boxShadow="md"
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontWeight="bold" mb={2}>{label}</Text>
          {payload.map((entry: any) => (
            <Text key={entry.name} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}% of target
            </Text>
          ))}
        </Box>
      );
    }
    return null;
  };

  if (!data || data.length === 0) {
    return (
      <Box
        p={6}
        borderRadius="lg"
        bg={bgColor}
        boxShadow="lg"
        borderColor="brand.200"
        borderWidth={1}
        height="400px"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text color="gray.500">
          No nutrition data available. Log your first meal to see your progress!
        </Text>
      </Box>
    );
  }

  return (
    <Box height="400px">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={processedData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="calories" name="Calories" fill={colors.calories} />
          <Bar dataKey="protein" name="Protein" fill={colors.protein} />
          <Bar dataKey="carbs" name="Carbs" fill={colors.carbs} />
          <Bar dataKey="fat" name="Fat" fill={colors.fat} />
          <Bar dataKey="fiber" name="Fiber" fill={colors.fiber} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default NutritionChart;
