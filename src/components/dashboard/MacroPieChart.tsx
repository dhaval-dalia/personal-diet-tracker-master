import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Heading, Text, VStack, useColorModeValue } from '@chakra-ui/react';

interface MacroPieChartProps {
  data?: Array<{
    date: string;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  title?: string;
}

const COLORS = ['#22C55E', '#4299E1', '#ECC94B']; // protein, carbs, fat
const LABELS = ['Protein', 'Carbs', 'Fat'];

const MacroPieChart: React.FC<MacroPieChartProps> = ({ data = [], title = 'Macro Distribution' }) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.800', 'white');

  // Aggregate macros for the most recent day (or week if you want)
  let protein = 0, carbs = 0, fat = 0;
  if (data.length > 0) {
    // Use the most recent day's data
    const latest = data[data.length - 1];
    protein = latest.protein;
    carbs = latest.carbs;
    fat = latest.fat;
  }

  const pieData = [
    { name: 'Protein', value: protein },
    { name: 'Carbs', value: carbs },
    { name: 'Fat', value: fat },
  ];

  const total = protein + carbs + fat;
  const hasData = total > 0;

  return (
    <Box
      p={6}
      borderRadius="lg"
      bg={bgColor}
      boxShadow="lg"
      borderColor="brand.200"
      borderWidth={1}
      width="100%"
      maxW="500px"
      mx="auto"
    >
      <VStack spacing={4} align="stretch">
        <Heading size="md" color={textColor} textAlign="center">
          {title}
        </Heading>
        {hasData ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value}g`, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <Text color="gray.500" textAlign="center">
            No macro data available. Log a meal to see your macro breakdown!
          </Text>
        )}
      </VStack>
    </Box>
  );
};

export default MacroPieChart; 