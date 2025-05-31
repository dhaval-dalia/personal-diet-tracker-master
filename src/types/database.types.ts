export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          age: number
          gender: string
          profession: string
          work_hours: number
          height_cm: number
          weight_kg: number
          activity_level: string
          dietary_restrictions: string[]
          allergies: string[]
          custom_allergies: string | null
          medical_conditions: string[]
          preferred_meal_times: Record<string, string>
          fitness_level: 'beginner' | 'intermediate' | 'advanced'
          preferred_workout_days: string[]
          goal_type: string
          target_weight: number | null
          target_date: string | null
          weekly_workout_goal: number
          water_intake_goal: number
          sleep_goal: number
          meal_prep_preference: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>
      }
      user_goals: {
        Row: {
          id: string
          user_id: string
          target_calories: number
          target_protein_ratio: number
          target_carbs_ratio: number
          target_fat_ratio: number
          target_weight_kg: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_goals']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_goals']['Insert']>
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          preferences: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_preferences']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>
      }
      meal_logs: {
        Row: {
          id: string
          user_id: string
          meal_type: string
          meal_date: string
          meal_time: string
          notes: string | null
          created_at: string
          total_calories: number
          total_protein: number
          total_carbs: number
          total_fat: number
          source: string
        }
        Insert: Omit<Database['public']['Tables']['meal_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['meal_logs']['Insert']>
      }
      meal_food_items: {
        Row: {
          id: string
          meal_log_id: string
          name: string
          calories: number
          protein: number
          carbs: number
          fat: number
          quantity: number
          unit: string
          barcode: string | null
        }
        Insert: Omit<Database['public']['Tables']['meal_food_items']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['meal_food_items']['Insert']>
      }
      food_items: {
        Row: {
          id: string
          name: string
          calories: number
          protein: number
          carbs: number
          fat: number
          serving_size: number
          serving_unit: string
          barcode: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['food_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['food_items']['Insert']>
      }
      nutrition_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          calories: number
          protein: number
          carbs: number
          fat: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['nutrition_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['nutrition_logs']['Insert']>
      }
      chat_interactions: {
        Row: {
          id: string
          user_id: string
          message: string
          response: any
          confirmed: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['chat_interactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['chat_interactions']['Insert']>
      }
    }
  }
} 