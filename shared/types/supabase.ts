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
          created_at: string
          updated_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
          equity_points: number
          total_earned: number
          referral_code: string
          referred_by: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          equity_points?: number
          total_earned?: number
          referral_code?: string
          referred_by?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          equity_points?: number
          total_earned?: number
          referral_code?: string
          referred_by?: string | null
        }
      }
      equity_transactions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          points: number
          transaction_type: 'signup' | 'referral' | 'daily_usage' | 'subscription' | 'app_usage'
          description: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          points: number
          transaction_type: 'signup' | 'referral' | 'daily_usage' | 'subscription' | 'app_usage'
          description: string
          metadata?: Json | null
        }
        Update: never
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string | null
          model: string
          total_tokens_used: number
          last_message_at: string | null
          archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          model?: string
          total_tokens_used?: number
          last_message_at?: string | null
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          model?: string
          total_tokens_used?: number
          last_message_at?: string | null
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          tokens_used: number | null
          model: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          tokens_used?: number | null
          model?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string
          tokens_used?: number | null
          model?: string | null
          metadata?: Json | null
          created_at?: string
        }
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
  }
}