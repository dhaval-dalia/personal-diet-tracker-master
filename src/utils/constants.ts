// src/utils/constants.ts
// This file centralizes environment variables and other static constants
// used throughout the application. This improves maintainability and ensures
// consistent access to configuration values.

// Supabase Credentials (publicly exposed via NEXT_PUBLIC_ prefix in Next.js)
// These are safe to be exposed client-side because Supabase RLS protects data.
export const SUPABASE_URL: string = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mhqtlftcuefoaqzmvlpq.supabase.co';
export const SUPABASE_ANON_KEY: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocXRsZnRjdWVmb2Fxem12bHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwOTI4MzUsImV4cCI6MjA2MzY2ODgzNX0.c_sfTTyvE6jxBMH3iRUUY38gtfCoQxP4I1WO77ajXLc';

// n8n Base URL (publicly exposed if needed for client-side reference, though direct webhook calls go via API routes)
// For local development, this will be http://localhost:5678

// Server-side environment variables (NOT exposed client-side)
// These should be configured in your deployment environment (e.g., .env.local, Vercel environment variables)
// and are accessed only within Next.js API routes or server-side functions.
export const SUPABASE_SERVICE_ROLE_KEY: string = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocXRsZnRjdWVmb2Fxem12bHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODA5MjgzNSwiZXhwIjoyMDYzNjY4ODM1fQ.WF3tNivX-0kZ0Ua9F0EleC0FZyAxucodLCYc7_m5-uQ';

// Next.js API Route Endpoints for n8n Webhooks
// These are the internal API routes that proxy requests to the actual n8n webhooks.
export const N8N_API_ROUTES = {
  ONBOARDING: '/api/n8n/onboarding',
  MEAL_LOGGING: '/api/n8n/meal-log',
  RECOMMENDATIONS: '/api/n8n/recommendations',
  CHAT_INTERACTIONS: '/api/n8n/chat-interactions',
};

// Placeholder for actual n8n webhook URLs (these should be stored as server-side env vars)
// Example: process.env.N8N_ONBOARDING_WEBHOOK_URL
// These are used within the Next.js API routes, NOT directly in client-side components.
export const N8N_WEBHOOK_URLS = {
  ONBOARDING: process.env.N8N_ONBOARDING_WEBHOOK_URL,
  MEAL_LOG: process.env.N8N_MEAL_LOG_WEBHOOK_URL,
  RECOMMENDATIONS: process.env.N8N_RECOMMENDATIONS_WEBHOOK_URL,
  CHAT_INTERACTIONS: process.env.N8N_CHAT_INTERACTIONS_WEBHOOK_URL,
} as const;

// Other application-wide constants
export const APP_NAME = 'Personal Fitness Tracker';
export const DEFAULT_TOAST_DURATION = 5000; // 5 seconds
