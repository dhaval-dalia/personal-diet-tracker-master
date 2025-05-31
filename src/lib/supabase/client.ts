// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL! || 'https://mhqtlftcuefoaqzmvlpq.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocXRsZnRjdWVmb2Fxem12bHBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwOTI4MzUsImV4cCI6MjA2MzY2ODgzNX0.c_sfTTyvE6jxBMH3iRUUY38gtfCoQxP4I1WO77ajXLc'!
  )
}
