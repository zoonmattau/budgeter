export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          currency: string
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          currency?: string
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          currency?: string
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string
          role: 'owner' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          joined_at?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          household_id: string | null
          name: string
          type: 'cash' | 'bank' | 'credit' | 'investment' | 'debt'
          balance: number
          is_asset: boolean
          institution: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          name: string
          type: 'cash' | 'bank' | 'credit' | 'investment' | 'debt'
          balance?: number
          is_asset?: boolean
          institution?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          name?: string
          type?: 'cash' | 'bank' | 'credit' | 'investment' | 'debt'
          balance?: number
          is_asset?: boolean
          institution?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          user_id: string
          household_id: string | null
          name: string
          icon: string
          color: string
          type: 'expense' | 'income' | 'transfer'
          is_system: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          name: string
          icon: string
          color: string
          type?: 'expense' | 'income' | 'transfer'
          is_system?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          name?: string
          icon?: string
          color?: string
          type?: 'expense' | 'income' | 'transfer'
          is_system?: boolean
          sort_order?: number
          created_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          id: string
          user_id: string
          household_id: string | null
          category_id: string
          month: string
          allocated: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          category_id: string
          month: string
          allocated?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          category_id?: string
          month?: string
          allocated?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      income_entries: {
        Row: {
          id: string
          user_id: string
          household_id: string | null
          month: string
          source: string
          amount: number
          is_recurring: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          month: string
          source: string
          amount: number
          is_recurring?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          month?: string
          source?: string
          amount?: number
          is_recurring?: boolean
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          household_id: string | null
          account_id: string | null
          category_id: string
          amount: number
          type: 'expense' | 'income' | 'transfer'
          description: string
          date: string
          is_recurring: boolean
          bill_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          account_id?: string | null
          category_id: string
          amount: number
          type?: 'expense' | 'income' | 'transfer'
          description: string
          date: string
          is_recurring?: boolean
          bill_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          account_id?: string | null
          category_id?: string
          amount?: number
          type?: 'expense' | 'income' | 'transfer'
          description?: string
          date?: string
          is_recurring?: boolean
          bill_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bills: {
        Row: {
          id: string
          user_id: string
          household_id: string | null
          category_id: string
          name: string
          amount: number
          frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
          due_day: number
          next_due: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          category_id: string
          name: string
          amount: number
          frequency?: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
          due_day: number
          next_due: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          category_id?: string
          name?: string
          amount?: number
          frequency?: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
          due_day?: number
          next_due?: string
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          id: string
          user_id: string
          household_id: string | null
          name: string
          icon: string
          color: string
          target_amount: number
          current_amount: number
          deadline: string | null
          status: 'active' | 'completed' | 'cancelled'
          visual_type: 'plant' | 'jar' | 'blocks'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          name: string
          icon?: string
          color?: string
          target_amount: number
          current_amount?: number
          deadline?: string | null
          status?: 'active' | 'completed' | 'cancelled'
          visual_type?: 'plant' | 'jar' | 'blocks'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          name?: string
          icon?: string
          color?: string
          target_amount?: number
          current_amount?: number
          deadline?: string | null
          status?: 'active' | 'completed' | 'cancelled'
          visual_type?: 'plant' | 'jar' | 'blocks'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          id: string
          goal_id: string
          amount: number
          source: 'manual' | 'budget' | 'challenge'
          note: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          amount: number
          source?: 'manual' | 'budget' | 'challenge'
          note?: string | null
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          amount?: number
          source?: 'manual' | 'budget' | 'challenge'
          note?: string | null
          date?: string
          created_at?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          id: string
          user_id: string
          goal_id: string | null
          title: string
          description: string
          type: 'save_amount' | 'reduce_category' | 'no_spend_day' | 'streak'
          target_value: number
          current_value: number
          start_date: string
          end_date: string
          status: 'active' | 'completed' | 'failed'
          reward_xp: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_id?: string | null
          title: string
          description: string
          type: 'save_amount' | 'reduce_category' | 'no_spend_day' | 'streak'
          target_value: number
          current_value?: number
          start_date: string
          end_date: string
          status?: 'active' | 'completed' | 'failed'
          reward_xp?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal_id?: string | null
          title?: string
          description?: string
          type?: 'save_amount' | 'reduce_category' | 'no_spend_day' | 'streak'
          target_value?: number
          current_value?: number
          start_date?: string
          end_date?: string
          status?: 'active' | 'completed' | 'failed'
          reward_xp?: number
          created_at?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          id: string
          user_id: string
          type: string
          earned_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          earned_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          earned_at?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          id: string
          user_id: string
          total_xp: number
          current_streak: number
          longest_streak: number
          goals_completed: number
          challenges_won: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_xp?: number
          current_streak?: number
          longest_streak?: number
          goals_completed?: number
          challenges_won?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_xp?: number
          current_streak?: number
          longest_streak?: number
          goals_completed?: number
          challenges_won?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
