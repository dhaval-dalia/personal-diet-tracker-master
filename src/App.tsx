// src/App.tsx
// This is the main application component that orchestrates all other components.
// It sets up the Chakra UI provider, the Supabase authentication provider,
// and manages the overall application flow based on user authentication and
// onboarding status. It also includes a basic navigation system.

// src/App.tsx

import React, { useState, useEffect, ReactNode } from 'react';
import {
  ChakraProvider,
  Box,
  Flex,
  VStack,
  HStack,
  Button,
  Text,
  Spacer,
  Link as ChakraLink
} from '@chakra-ui/react';
import theme from './theme';
import { AuthProvider, useAuth } from './hooks/useAuth';
import ErrorBoundary from './components/shared/ErrorBoundary';
import LoadingSpinner from './components/shared/LoadingSpinner';
import { useRouter } from 'next/router';

import LoginForm from './components/auth/LoginForm';
import OnboardingFlow from './components/auth/OnboardingFlow';
import MealLogger from './components/meal-logging/MealLogger';
import DailyOverview from './components/dashboard/DailyOverview';
import NutritionChart from './components/dashboard/NutritionChart';
import ProgressTracker from './components/dashboard/ProgressTracker';
import RecommendationCard from './components/dashboard/RecommendationCard';
import UserProfile from './components/profile/UserProfile';
import GoalSetting from './components/profile/GoalSetting';
import Preferences from './components/profile/Preferences';
import Dashboard from './components/dashboard/Dashboard';

import { supabase } from './services/supabase';
import { useErrorHandling } from './hooks/useErrorHandling';

type AppView = 'login' | 'signup' | 'onboarding' | 'dashboard' | 'log-meal' | 'profile' | 'goals' | 'preferences';

interface AppConProps {
  children?: ReactNode;
}

export const AppCon: React.FC<AppConProps> = ({ children }) => {
  const { user, isLoading, isAuthReady, signOut } = useAuth();
  const { handleError } = useErrorHandling();
  const router = useRouter();

  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isLoadingOnboardingStatus, setIsLoadingOnboardingStatus] = useState(true);
  const [userGoals, setUserGoals] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [mealLogs, setMealLogs] = useState<any[]>([]);

  // Fetch user goals when user changes
  useEffect(() => {
    const fetchUserGoals = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_goals')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching goals:', error);
          return;
        }

        if (data) {
          setUserGoals(data);
        }
      } catch (err) {
        console.error('Error in fetchUserGoals:', err);
      }
    };

    fetchUserGoals();

    // Subscribe to real-time updates
    const goalsSubscription = supabase
      .channel('public:user_goals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_goals',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          console.log('Goals updated in App:', payload);
          if (payload.new) {
            setUserGoals(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      goalsSubscription.unsubscribe();
    };
  }, [user?.id]);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isAuthReady || isLoading) return;

      setIsLoadingOnboardingStatus(true);

      if (user) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') throw error;

          if (data) {
            setIsOnboardingComplete(true);
            setUserProfile(data);
          } else {
            setIsOnboardingComplete(false);
            // Redirect to onboarding if profile is incomplete
            if (router.pathname !== '/onboarding') {
              router.push('/onboarding');
            }
          }
        } catch (err) {
          handleError(err, 'Failed to check onboarding status');
          router.push('/login');
        } finally {
          setIsLoadingOnboardingStatus(false);
        }
      } else {
        router.push('/login');
        setIsLoadingOnboardingStatus(false);
      }
    };

    checkOnboardingStatus();
  }, [user, isLoading, isAuthReady, handleError, router]);

  useEffect(() => {
    const fetchMealLogs = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('meal_logs')
          .select('*')
          .eq('user_id', user.id);

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching meal logs:', error);
          return;
        }

        if (data) {
          setMealLogs(data);
        }
      } catch (err) {
        console.error('Error in fetchMealLogs:', err);
      }
    };

    fetchMealLogs();
  }, [user?.id]);

  const handleLoginSuccess = () => {
    setIsLoadingOnboardingStatus(true);
  };

  const handleSignUpSuccess = () => {
    router.push('/onboarding');
  };

  const handleOnboardingComplete = () => {
    setIsOnboardingComplete(true);
    router.push('/dashboard');
  };

  const renderContent = () => {
    if (isLoading || isLoadingOnboardingStatus) {
      return <LoadingSpinner message="Initializing application..." />;
    }

    if (!user) {
      return (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onSwitchToSignUp={() => router.push('/signup')}
        />
      );
    }

    if (!isOnboardingComplete && router.pathname === '/onboarding') {
      return <OnboardingFlow onOnboardingComplete={handleOnboardingComplete} />;
    }

    switch (router.pathname) {
      case '/dashboard':
        return <Dashboard />;
      case '/profile':
        return <UserProfile />;
      case '/goals':
        return <GoalSetting />;
      case '/preferences':
        return <Preferences />;
      case '/log-meal':
        return <MealLogger />;
      default:
        return <LoadingSpinner message="Loading..." />;
    }
  };

  return (
    <Flex direction="column" minH="100vh">
      {user && (
        <Box bg="brand.700" py={4} px={8} boxShadow="md">
          <HStack spacing={8} justifyContent="space-between" alignItems="center">
            <Text fontSize="2xl" fontWeight="bold" color="white">
              Fitness Tracker
            </Text>
            <HStack spacing={6}>
              <ChakraLink onClick={() => router.push('/dashboard')} color="whiteAlpha.800">
                Dashboard
              </ChakraLink>
              <ChakraLink onClick={() => router.push('/log-meal')} color="whiteAlpha.800">
                Log Meal
              </ChakraLink>
              <ChakraLink onClick={() => router.push('/profile')} color="whiteAlpha.800">
                Profile
              </ChakraLink>
              <ChakraLink onClick={() => router.push('/goals')} color="whiteAlpha.800">
                Goals
              </ChakraLink>
              <ChakraLink onClick={() => router.push('/preferences')} color="whiteAlpha.800">
                Preferences
              </ChakraLink>
            </HStack>
            <HStack>
              <Text color="whiteAlpha.700" fontSize="sm">
                Logged in as: {user.email}
              </Text>
              <Button
                onClick={signOut}
                size="sm"
                colorScheme="red"
                variant="outline"
                borderColor="red.300"
                color="red.100"
                _hover={{ bg: 'red.600', color: 'white' }}
              >
                Logout
              </Button>
            </HStack>
          </HStack>
        </Box>
      )}

      <Box flex="1" p={8} bg="brand.50">
        {children || renderContent()}
      </Box>

      <Box bg="brand.900" py={4} px={8} textAlign="center" color="whiteAlpha.600" fontSize="sm">
        <Text>&copy; {new Date().getFullYear()} Personal Fitness Tracker. All rights reserved.</Text>
      </Box>
    </Flex>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ChakraProvider theme={theme}>
        <AuthProvider>
          <AppCon>
            <Dashboard />
          </AppCon>
        </AuthProvider>
      </ChakraProvider>
    </ErrorBoundary>
  );
};

export default App;

