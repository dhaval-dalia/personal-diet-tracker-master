// src/components/profile/Preferences.tsx
// This component allows users to manage their application preferences,
// such as notification settings or theme preferences. It interacts with Supabase
// to store and retrieve these settings.

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Stack,
  Heading,
  Text,
  HStack,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Select,
  Switch,
  Divider,
  useTheme,
} from '@chakra-ui/react';
import { preferencesSchema } from '../../utils/validation';
import { useAuth } from '../../hooks/useAuth';
import { useErrorHandling } from '../../hooks/useErrorHandling';
import { supabase } from '../../services/supabase';
import LoadingSpinner from '../shared/LoadingSpinner';

// Define the type for form data based on the Zod schema
type PreferencesInputs = z.infer<typeof preferencesSchema>;

const Preferences: React.FC = () => {
  const { user, isAuthReady } = useAuth();
  const { handleError, showToast } = useErrorHandling();
  const theme = useTheme();

  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
    reset,
    watch, // To conditionally enable/disable notification frequency
  } = useForm<PreferencesInputs>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      receiveNotifications: false,
      notificationFrequency: 'daily',
      themePreference: 'system',
    },
  });

  const receiveNotifications = watch('receiveNotifications');

  // Fetch user preferences data on component mount or when user/auth state changes
  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!user?.id || !isAuthReady) {
        setIsLoadingPreferences(false);
        return;
      }

      setIsLoadingPreferences(true);
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data?.preferences) {
          reset({
            receiveNotifications: data.preferences.receiveNotifications || false,
            notificationFrequency: data.preferences.notificationFrequency || 'daily',
            themePreference: data.preferences.themePreference || 'system',
          });
        }
      } catch (err) {
        handleError(err, 'Failed to load user preferences');
      } finally {
        setIsLoadingPreferences(false);
      }
    };

    fetchUserPreferences();

    // Set up real-time listener for user_preferences
    const preferencesSubscription = supabase
      .channel('public:user_preferences')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_preferences',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new) {
            reset({
              receiveNotifications: (payload.new as any).receiveNotifications || false,
              notificationFrequency: (payload.new as any).notificationFrequency || 'daily',
              themePreference: (payload.new as any).themePreference || 'system',
            });
            showToast({
              title: 'Preferences Updated!',
              description: 'Your preferences have been updated in real-time.',
              status: 'info',
            });
          }
        }
      )
      .subscribe();

    return () => {
      preferencesSubscription.unsubscribe();
    };

  }, [user?.id, isAuthReady, reset, handleError, showToast]);

  /**
   * Handles the form submission for updating user preferences.
   * @param data - The validated form data.
   */
  const onSubmit = async (data: PreferencesInputs) => {
    if (!user?.id) {
      handleError('User not authenticated.', 'Authentication Error');
      return;
    }

    setIsSavingPreferences(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: {
            receiveNotifications: data.receiveNotifications,
            notificationFrequency: data.notificationFrequency,
            themePreference: data.themePreference
          }
        }, { onConflict: 'user_id' });

      if (error) throw error;

      showToast({
        title: 'Preferences Saved!',
        description: 'Your application preferences have been updated.',
        status: 'success',
      });
      reset(data); // Reset form with new data to clear dirty state
    } catch (err) {
      handleError(err, 'Failed to save preferences');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  if (isLoadingPreferences) {
    return <LoadingSpinner message="Loading your preferences..." />;
  }

  return (
    <Box
      p={8}
      maxWidth="600px"
      borderWidth={1}
      borderRadius="lg"
      boxShadow="lg"
      bg="whiteAlpha.700"
      borderColor="brand.200"
      mx="auto"
      my={8}
    >
      <Stack gap={6}>
        <Heading as="h2" size="xl" textAlign="center" color="text.dark">
          App Preferences
        </Heading>
        <Text fontSize="md" color="text.light" textAlign="center" mb={4}>
          Customize your app experience.
        </Text>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack gap={4}>
            <FormControl id="receiveNotifications" display="flex" alignItems="center">
              <FormLabel htmlFor="receiveNotifications" mb="0" color="text.dark">
                Receive Notifications?
              </FormLabel>
              <Switch
                id="receiveNotifications"
                {...register('receiveNotifications')}
                colorScheme="teal"
                size="lg"
              />
            </FormControl>

            <FormControl id="notificationFrequency" isInvalid={!!errors.notificationFrequency}>
              <FormLabel color="text.dark">Notification Frequency</FormLabel>
              <Select
                placeholder="Select frequency"
                {...register('notificationFrequency')}
                isDisabled={!receiveNotifications} // Disable if notifications are off
                borderColor="brand.200"
                _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
              <FormErrorMessage>{errors.notificationFrequency && errors.notificationFrequency.message}</FormErrorMessage>
            </FormControl>

            <Divider my={4} borderColor="brand.100" />

            <FormControl id="themePreference" isInvalid={!!errors.themePreference}>
              <FormLabel color="text.dark">Theme Preference</FormLabel>
              <Select
                placeholder="Select theme"
                {...register('themePreference')}
                borderColor="brand.200"
                _focus={{ borderColor: 'brand.300', boxShadow: `0 0 0 1px ${theme.colors.brand['300']}` }}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System Default</option>
              </Select>
              <FormErrorMessage>{errors.themePreference && errors.themePreference.message}</FormErrorMessage>
            </FormControl>

            <Button
              type="submit"
              isLoading={isSavingPreferences}
              disabled={!isDirty}
              colorScheme="teal"
              variant="solid"
              width="full"
              mt={4}
              bg="accent.500"
              color="white"
              _hover={{ bg: 'accent.600' }}
            >
              Save Preferences
            </Button>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
};

export default Preferences;
