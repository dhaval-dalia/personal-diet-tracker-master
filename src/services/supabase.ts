          // src/services/supabase.ts
// This file initializes the Supabase client using environment variables.
// It provides the main Supabase client instance for interacting with the database
// and authentication services throughout the application.

import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are loaded and available.
// In a Next.js environment, NEXT_PUBLIC_ variables are automatically exposed to the client.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mhqtlftcuefoaqzmvlpq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocXRsZnRjdWVmb2Fxem12bHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwOTI4MzUsImV4cCI6MjA2MzY2ODgzNX0.c_sfTTyvE6jxBMH3iRUUY38gtfCoQxP4I1WO77ajXLc';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create and export the Supabase client instance.
// This client is used for all client-side interactions with Supabase,
// including authentication and data fetching/mutations, respecting RLS policies.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Optional: For server-side Supabase client (e.g., in Next.js API routes)
// This client would use the SUPABASE_SERVICE_ROLE_KEY and bypass RLS,
// thus it must ONLY be used in secure server environments.
export const createServerClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocXRsZnRjdWVmb2Fxem12bHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODA5MjgzNSwiZXhwIjoyMDYzNjY4ODM1fQ.WF3tNivX-0kZ0Ua9F0EleC0FZyAxucodLCYc7_m5-uQ';
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(supabaseUrl, serviceRoleKey);
};
