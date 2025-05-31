// src/services/n8nWebhooks.ts
// This file defines functions to interact with n8n workflows via Next.js API routes.
// It acts as an abstraction layer, preventing direct exposure of n8n webhook URLs
// to the client-side and ensuring all calls are proxied through a secure backend route.

import { supabase } from './supabase';

export interface MealLogData {
  id?: string;
  user_id: string;
  meal_type: string;
  meal_date: string;
  meal_time: string;
  food_items: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity: number;
    unit: string;
    barcode?: string;
  }>;
  notes?: string;
  created_at: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  source: string;
}

interface ChatMessageData {
  user_id: string;
  message: string;
  created_at: string;
  response?: string;
  context: {
    platform: string;
    source: string;
  };
}

interface OnboardingData {
  user_id: string;
  created_at: string;
  context: {
    platform: string;
    source: string;
  };
}

interface RecommendationRequest {
  user_id: string;
  created_at: string;
  context: {
    platform: string;
    source: string;
  };
}

/**
 * Logs a meal by sending meal data to the /api/n8n/meal-log Next.js API route.
 * This route then forwards the data to the n8n Meal Logging Workflow.
 * @param mealData - The data for the meal to be logged.
 * @returns A promise that resolves with the response data from the n8n workflow.
 * @throws An error if the API call fails.
 */
export const logMeal = async (mealData: MealLogData): Promise<MealLogData> => {
  console.log('logMeal: Starting meal log process');
  console.log('logMeal: Received meal data:', JSON.stringify(mealData, null, 2));

  try {
    // First, insert the meal log
    console.log('logMeal: Attempting to save meal log to Supabase');
    const { data: mealLog, error: mealLogError } = await supabase
      .from('meal_logs')
      .insert({
        user_id: mealData.user_id,
        meal_type: mealData.meal_type,
        meal_date: mealData.meal_date,
        meal_time: mealData.meal_time,
        notes: mealData.notes,
        created_at: mealData.created_at,
        total_calories: mealData.total_calories,
        total_protein: mealData.total_protein,
        total_carbs: mealData.total_carbs,
        total_fat: mealData.total_fat,
        source: mealData.source
      })
      .select()
      .single();

    if (mealLogError) {
      console.error('logMeal: Error saving meal log:', mealLogError);
      throw mealLogError;
    }

    console.log('logMeal: Meal log saved successfully:', mealLog);

    // Then, insert the food items
    if (mealData.food_items && mealData.food_items.length > 0) {
      console.log('logMeal: Saving food items');
      const foodItems = mealData.food_items.map(item => ({
        meal_log_id: mealLog.id,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        quantity: item.quantity,
        unit: item.unit,
        barcode: item.barcode
      }));

      const { error: foodItemsError } = await supabase
        .from('meal_food_items')
        .insert(foodItems);

      if (foodItemsError) {
        console.error('logMeal: Error saving food items:', foodItemsError);
        throw foodItemsError;
      }

      console.log('logMeal: Food items saved successfully');
    }

    // Return the complete meal data
    return {
      ...mealData,
      id: mealLog.id
    };
  } catch (error) {
    console.error('logMeal: Error in logMeal service:', error);
    throw error;
  }
};

export const processChatMessage = async (data: ChatMessageData) => {
  try {
    // First save to database directly
    const { error: chatError } = await supabase
      .from('chat_interactions')
      .insert([
        {
          user_id: data.user_id,
          message: data.message,
          response: data.response,
          confirmed: true,
        },
      ]);

    if (chatError) {
      console.error('Error saving chat interaction:', chatError);
      throw new Error('Failed to save chat interaction');
    }

    // Then trigger n8n workflow
    const response = await fetch('/api/n8n/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('n8n webhook error:', responseData);
      throw new Error(responseData.error || responseData.details || 'Failed to process chat message');
    }

    return responseData;
  } catch (error: any) {
    console.error('Error in processChatMessage service:', error);
    throw error;
  }
};

/**
 * Triggers the onboarding workflow for a new user
 * @param data - The onboarding data containing user ID and context
 * @returns A promise that resolves with the response data from the n8n workflow
 * @throws An error if the API call fails
 */
export const triggerOnboarding = async (data: OnboardingData) => {
  try {
    const response = await fetch('/api/n8n/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('n8n onboarding webhook error:', responseData);
      throw new Error(responseData.error || responseData.details || 'Failed to trigger onboarding');
    }

    return responseData;
  } catch (error: any) {
    console.error('Error in triggerOnboarding service:', error);
    throw error;
  }
};

export const requestRecommendations = async (userId: string) => {
  try {
    const response = await fetch('/api/n8n/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        created_at: new Date().toISOString(),
        context: {
          platform: 'web',
          source: 'recommendations-widget'
        }
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || responseData.details || 'Failed to fetch recommendations');
    }

    return responseData;
  } catch (error: any) {
    console.error('Error in requestRecommendations service:', error);
    throw error;
  }
};

export const requestAIRecommendations = async (data: RecommendationRequest) => {
  try {
    const response = await fetch('/api/n8n/ai-recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || responseData.details || 'Failed to fetch AI recommendations');
    }

    return responseData;
  } catch (error: any) {
    console.error('Error in requestAIRecommendations service:', error);
    throw error;
  }
};