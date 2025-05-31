import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Spinner } from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import MealLogger from '../components/meal-logging/MealLogger';
import Layout from '../components/shared/Layout';

export default function LogMealPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <Spinner size="xl" color="brand.500" />
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <MealLogger />
    </Layout>
  );
}