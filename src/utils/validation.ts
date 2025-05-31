// src/utils/validation.ts
// This file defines Zod schemas for various data structures used in the application.
// Zod provides a powerful, TypeScript-first way to declare validation schemas,
// which can then be used with React Hook Form for client-side validation.

import { z } from 'zod';

// Common profanity list (you can expand this)
const profanityList = [
  'fuck', 'bitch', 'asshole', // Add actual profanity words here
];

// Utility function to check for profanity
const containsProfanity = (text: string): boolean => {
  const normalizedText = text.toLowerCase();
  return profanityList.some(word => normalizedText.includes(word));
};

// Custom error messages
const errorMessages = {
  profanity: 'Please use appropriate language',
  name: {
    required: 'Name is required',
    min: 'Name must be at least 2 characters',
    max: 'Name must not exceed 50 characters',
    format: 'Name can only contain letters, spaces, hyphens, and apostrophes',
  },
  age: {
    required: 'Age is required',
    min: 'Age must be at least 10 years',
    max: 'Age must not exceed 120 years',
  },
  height: {
    required: 'Height is required',
    min: 'Height must be at least 50 cm',
    max: 'Height must not exceed 250 cm',
  },
  weight: {
    required: 'Weight is required',
    min: 'Weight must be at least 20 kg',
    max: 'Weight must not exceed 300 kg',
  },
};

// --- Auth Schemas ---

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const signupSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string()
    .min(8, 'Confirm Password must be at least 8 characters long'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// --- Onboarding Schemas ---

export const onboardingSchema = z.object({
  fullName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .refine(val => !containsProfanity(val), 'Please use appropriate language'),
  age: z.number()
    .min(10, 'Age must be at least 10 years')
    .max(120, 'Age must not exceed 120 years'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select a gender',
  }),
  heightCm: z.number()
    .min(50, 'Height must be at least 50 cm')
    .max(250, 'Height must not exceed 250 cm'),
  weightKg: z.number()
    .min(20, 'Weight must be at least 20 kg')
    .max(300, 'Weight must not exceed 300 kg'),
  activityLevel: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extra_active'
  ], {
    required_error: 'Please select an activity level',
  }),
  goal: z.enum([
    'lose_weight',
    'maintain_weight',
    'gain_weight',
    'build_muscle'
  ], {
    required_error: 'Please select a goal',
  }),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  medicalConditions: z.array(z.string()).optional(),
  preferredMealTimes: z.record(z.string()).optional(),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced'], {
    required_error: 'Please select your fitness level',
  }).optional(),
  preferredWorkoutDays: z.array(z.string()).optional(),
  targetWeight: z.number()
    .min(20, 'Target weight must be at least 20 kg')
    .max(300, 'Target weight must not exceed 300 kg')
    .optional(),
  targetDate: z.string().optional(),
  weeklyWorkoutGoal: z.number()
    .min(0, 'Weekly workout goal must be at least 0 days')
    .max(7, 'Weekly workout goal cannot exceed 7 days')
    .optional(),
  waterIntakeGoal: z.number()
    .min(0, 'Water intake goal must be at least 0 liters')
    .max(10, 'Water intake goal cannot exceed 10 liters')
    .optional(),
  sleepGoal: z.number()
    .min(4, 'Sleep goal must be at least 4 hours')
    .max(12, 'Sleep goal cannot exceed 12 hours')
    .optional(),
  mealPrepPreference: z.enum(['daily', 'weekly', 'none'], {
    required_error: 'Please select a meal prep preference',
  }).optional(),
}).refine(data => {
  if (data.goal === 'lose_weight' && data.targetWeight) {
    return data.targetWeight < data.weightKg;
  }
  return true;
}, {
  message: 'Target weight must be less than current weight for weight loss goals',
  path: ['targetWeight'],
});

// --- Meal Logging Schemas ---

export const foodItemSchema = z.object({
  name: z.string().min(1, 'Food name is required'),
  calories: z.number().min(0, 'Calories cannot be negative'),
  protein: z.number().min(0, 'Protein cannot be negative'),
  carbs: z.number().min(0, 'Carbs cannot be negative'),
  fat: z.number().min(0, 'Fat cannot be negative'),
  quantity: z.number().min(0.1, 'Quantity must be greater than 0'),
  unit: z.string().min(1, 'Unit is required (e.g., g, ml, piece)'),
  barcode: z.string().optional(),
});

// Form validation schema (for user input)
export const mealLogFormSchema = z.object({
  meal_type: z.string().min(1, 'Meal type is required'),
  meal_date: z.string().min(1, 'Date is required'),
  meal_time: z.string().min(1, 'Time is required'),
  food_items: z.array(foodItemSchema).min(1, 'At least one food item is required'),
  notes: z.string().optional(),
});

// Complete meal data validation schema (includes system fields)
export const mealLogSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  meal_type: z.string().min(1, 'Meal type is required'),
  meal_date: z.string().min(1, 'Date is required'),
  meal_time: z.string().min(1, 'Time is required'),
  food_items: z.array(foodItemSchema).min(1, 'At least one food item is required'),
  notes: z.string().optional(),
  created_at: z.string().min(1, 'Created at timestamp is required'),
  total_calories: z.number().min(0),
  total_protein: z.number().min(0),
  total_carbs: z.number().min(0),
  total_fat: z.number().min(0),
  source: z.string().min(1, 'Source is required'),
});

// --- User Profile & Goal Setting Schemas ---

export const userProfileSchema = z.object({
  fullName: z.string()
    .min(2, errorMessages.name.min)
    .max(50, errorMessages.name.max)
    .regex(/^[a-zA-Z\s-']+$/, errorMessages.name.format)
    .refine(val => !containsProfanity(val), errorMessages.profanity),
  age: z.number()
    .min(10, errorMessages.age.min)
    .max(120, errorMessages.age.max),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select a gender',
  }),
  heightCm: z.number()
    .min(50, errorMessages.height.min)
    .max(250, errorMessages.height.max),
  weightKg: z.number()
    .min(20, errorMessages.weight.min)
    .max(300, errorMessages.weight.max),
  activityLevel: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extra_active'
  ], {
    required_error: 'Please select an activity level',
  }),
}).refine(data => {
  // Additional logical validations
  const bmi = data.weightKg / Math.pow(data.heightCm / 100, 2);
  return bmi >= 10 && bmi <= 50; // Reasonable BMI range
}, {
  message: 'The combination of height and weight seems unrealistic',
  path: ['weightKg'], // Show error on weight field
});

export const goalSettingSchema = z.object({
  target_calories: z.number()
    .min(500, 'Calories must be at least 500')
    .max(5000, 'Calories must not exceed 5000')
    .optional(),
  target_protein_ratio: z.number()
    .min(0, 'Protein ratio must be at least 0%')
    .max(100, 'Protein ratio must not exceed 100%')
    .optional(),
  target_carbs_ratio: z.number()
    .min(0, 'Carbs ratio must be at least 0%')
    .max(100, 'Carbs ratio must not exceed 100%')
    .optional(),
  target_fat_ratio: z.number()
    .min(0, 'Fat ratio must be at least 0%')
    .max(100, 'Fat ratio must not exceed 100%')
    .optional(),
  target_weight_kg: z.number()
    .min(20, 'Weight must be at least 20 kg')
    .max(300, 'Weight must not exceed 300 kg')
    .optional(),
  target_date: z.string()
    .optional(),
  weekly_workout_goal: z.number()
    .min(0, 'Weekly workout goal must be at least 0 days')
    .max(7, 'Weekly workout goal cannot exceed 7 days')
    .optional(),
  water_intake_goal: z.number()
    .min(0, 'Water intake goal must be at least 0 liters')
    .max(10, 'Water intake goal cannot exceed 10 liters')
    .optional(),
  sleep_goal: z.number()
    .min(4, 'Sleep goal must be at least 4 hours')
    .max(12, 'Sleep goal cannot exceed 12 hours')
    .optional(),
}).refine(data => {
  const { target_protein_ratio, target_carbs_ratio, target_fat_ratio } = data;
  if (target_protein_ratio && target_carbs_ratio && target_fat_ratio) {
    const sum = target_protein_ratio + target_carbs_ratio + target_fat_ratio;
    return sum === 100;
  }
  return true;
}, {
  message: 'Macronutrient ratios must sum to 100%',
  path: ['root'],
});

export const preferencesSchema = z.object({
  receiveNotifications: z.boolean(),
  notificationFrequency: z.enum(['daily', 'weekly', 'monthly']),
  themePreference: z.enum(['light', 'dark', 'system']),
});
