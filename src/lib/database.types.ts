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
          mobile: string | null
          onboarding_completed: boolean
          friend_code: string | null
          basiq_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          currency?: string
          mobile?: string | null
          onboarding_completed?: boolean
          friend_code?: string | null
          basiq_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          currency?: string
          mobile?: string | null
          onboarding_completed?: boolean
          friend_code?: string | null
          basiq_user_id?: string | null
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
          invite_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          invite_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          invite_code?: string | null
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
          contribution_amount: number | null
          contribution_frequency: 'weekly' | 'fortnightly' | 'monthly' | null
          joined_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          role?: 'owner' | 'member'
          contribution_amount?: number | null
          contribution_frequency?: 'weekly' | 'fortnightly' | 'monthly' | null
          joined_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          contribution_amount?: number | null
          contribution_frequency?: 'weekly' | 'fortnightly' | 'monthly' | null
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
          type: 'cash' | 'bank' | 'credit' | 'investment' | 'debt' | 'loan' | 'credit_card'
          balance: number
          is_asset: boolean
          institution: string | null
          interest_rate: number | null
          interest_free_days: number | null
          due_date: number | null
          minimum_payment: number | null
          original_amount: number | null
          payoff_date: string | null
          payment_frequency: 'weekly' | 'fortnightly' | 'monthly' | null
          credit_limit: number | null
          interest_last_applied: string | null
          basiq_account_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          name: string
          type: 'cash' | 'bank' | 'credit' | 'investment' | 'debt' | 'loan' | 'credit_card'
          balance?: number
          is_asset?: boolean
          institution?: string | null
          interest_rate?: number | null
          interest_free_days?: number | null
          due_date?: number | null
          minimum_payment?: number | null
          original_amount?: number | null
          payoff_date?: string | null
          payment_frequency?: 'weekly' | 'fortnightly' | 'monthly' | null
          credit_limit?: number | null
          interest_last_applied?: string | null
          basiq_account_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          name?: string
          type?: 'cash' | 'bank' | 'credit' | 'investment' | 'debt' | 'loan' | 'credit_card'
          balance?: number
          is_asset?: boolean
          institution?: string | null
          interest_rate?: number | null
          interest_free_days?: number | null
          due_date?: number | null
          minimum_payment?: number | null
          original_amount?: number | null
          payoff_date?: string | null
          payment_frequency?: 'weekly' | 'fortnightly' | 'monthly' | null
          credit_limit?: number | null
          interest_last_applied?: string | null
          basiq_account_id?: string | null
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
      budget_settings: {
        Row: {
          id: string
          user_id: string
          household_id: string | null
          month: string
          extra_debt_payment: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id?: string | null
          month: string
          extra_debt_payment?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string | null
          month?: string
          extra_debt_payment?: number
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
          pay_frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly' | null
          pay_day: number | null
          next_pay_date: string | null
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
          pay_frequency?: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly' | null
          pay_day?: number | null
          next_pay_date?: string | null
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
          pay_frequency?: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly' | null
          pay_day?: number | null
          next_pay_date?: string | null
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
          is_one_off: boolean
          saved_amount: number
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
          is_one_off?: boolean
          saved_amount?: number
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
          is_one_off?: boolean
          saved_amount?: number
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
          goal_type: 'savings' | 'debt_payoff' | 'net_worth_milestone'
          linked_account_id: string | null
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
          goal_type?: 'savings' | 'debt_payoff'
          linked_account_id?: string | null
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
          goal_type?: 'savings' | 'debt_payoff'
          linked_account_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          id: string
          goal_id: string
          user_id: string
          amount: number
          source: 'manual' | 'budget' | 'challenge'
          note: string | null
          date: string
          created_at: string
        }
        Insert: {
          id?: string
          goal_id: string
          user_id: string
          amount: number
          source?: 'manual' | 'budget' | 'challenge'
          note?: string | null
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          goal_id?: string
          user_id?: string
          amount?: number
          source?: 'manual' | 'budget' | 'challenge'
          note?: string | null
          date?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
      net_worth_snapshots: {
        Row: {
          id: string
          user_id: string
          total_assets: number
          total_liabilities: number
          net_worth: number
          snapshot_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_assets: number
          total_liabilities: number
          net_worth: number
          snapshot_date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_assets?: number
          total_liabilities?: number
          net_worth?: number
          snapshot_date?: string
          created_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          addressee_id: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          addressee_id?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          friends_leaderboard_visible: boolean
          global_leaderboard_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friends_leaderboard_visible?: boolean
          global_leaderboard_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friends_leaderboard_visible?: boolean
          global_leaderboard_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_patterns: {
        Row: {
          id: string
          user_id: string
          name: string
          normalized_name: string
          typical_amount: number
          amount_variance: number
          frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
          typical_day: number
          day_variance: number
          confidence: number
          occurrence_count: number
          category_id: string | null
          is_active: boolean
          last_occurrence: string | null
          next_expected: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          normalized_name: string
          typical_amount: number
          amount_variance?: number
          frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
          typical_day: number
          day_variance?: number
          confidence?: number
          occurrence_count?: number
          category_id?: string | null
          is_active?: boolean
          last_occurrence?: string | null
          next_expected?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          normalized_name?: string
          typical_amount?: number
          amount_variance?: number
          frequency?: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly'
          typical_day?: number
          day_variance?: number
          confidence?: number
          occurrence_count?: number
          category_id?: string | null
          is_active?: boolean
          last_occurrence?: string | null
          next_expected?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_patterns_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_patterns_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      pattern_predictions: {
        Row: {
          id: string
          pattern_id: string
          user_id: string
          predicted_date: string
          predicted_amount: number
          status: 'pending' | 'matched' | 'dismissed' | 'expired'
          matched_transaction_id: string | null
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pattern_id: string
          user_id: string
          predicted_date: string
          predicted_amount: number
          status?: 'pending' | 'matched' | 'dismissed' | 'expired'
          matched_transaction_id?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pattern_id?: string
          user_id?: string
          predicted_date?: string
          predicted_amount?: number
          status?: 'pending' | 'matched' | 'dismissed' | 'expired'
          matched_transaction_id?: string | null
          resolved_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pattern_predictions_pattern_id_fkey"
            columns: ["pattern_id"]
            referencedRelation: "payment_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pattern_predictions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pattern_predictions_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          }
        ]
      }
      household_invitations: {
        Row: {
          id: string
          household_id: string
          invited_email: string
          invited_by: string
          status: 'pending' | 'accepted' | 'declined'
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          invited_email: string
          invited_by: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          invited_email?: string
          invited_by?: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invitations_household_id_fkey"
            columns: ["household_id"]
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_invitations_invited_by_fkey"
            columns: ["invited_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
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
