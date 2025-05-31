// src/hooks/useMealLogging.ts
// This custom hook encapsulates the logic for logging meals,
// managing state related to meal entry, and interacting with the
// n8n meal logging workflow via the n8nWebhooks service.

import { useState, useCallback } from 'react';
import { useErrorHandling } from './useErrorHandling';
import { useAuth } from './useAuth';
import { logMeal, MealLogData } from '../services/n8nWebhooks';
import { mealLogSchema, foodItemSchema } from '../utils/validation';
import { z } from 'zod';
import { supabase } from '../services/supabase';

// Define types for meal and food items based on Zod schemas
export type FoodItemData = z.infer<typeof foodItemSchema>;

export const useMealLogging = () => {
  const [isLogging, setIsLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const { handleError } = useErrorHandling();
  const { user } = useAuth();

  const fetchMealLogs = useCallback(async () => {
    if (!user?.id) return null;
    
    const { data: mealLogs, error: mealLogsError } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (mealLogsError) {
      console.error('Error fetching meal logs:', mealLogsError);
      return null;
    }

    return mealLogs;
  }, [user?.id]);

  /**
   * Submits meal data to the n8n meal logging workflow.
   * @param mealData - The complete meal log data.
   */
  const submitMealLog = useCallback(async (mealData: Omit<MealLogData, 'user_id' | 'created_at'>) => {
    console.log('useMealLogging: Starting submitMealLog');
    console.log('useMealLogging: User ID:', user?.id);
    
    if (!user?.id) {
      console.error('useMealLogging: No user ID found');
      throw new Error('User must be logged in to log meals');
    }
    
    setIsLogging(true);
    setLogSuccess(false);
    try {
      console.log('useMealLogging: Preparing complete meal data');
      const completeMealData: MealLogData = {
        ...mealData,
        user_id: user.id,
        created_at: new Date().toISOString()
      };

      console.log('useMealLogging: Validating meal data');
      mealLogSchema.parse(completeMealData);
      
      console.log('useMealLogging: Calling logMeal service');
      const response = await logMeal(completeMealData);
      console.log('useMealLogging: Meal logged successfully:', response);
      setLogSuccess(true);
      return response;
    } catch (error) {
      console.error('useMealLogging: Error in submitMealLog:', error);
      handleError(error);
      setLogSuccess(false);
      throw error;
    } finally {
      setIsLogging(false);
    }
  }, [handleError, user?.id]);

  return {
    isLogging,
    logSuccess,
    submitMealLog,
    fetchMealLogs
  };
};
