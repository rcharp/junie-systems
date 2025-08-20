export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          caller_name: string
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone_number: string
          preferred_date: string
          preferred_time: string
          service_type: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caller_name: string
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone_number: string
          preferred_date: string
          preferred_time: string
          service_type: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caller_name?: string
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone_number?: string
          preferred_date?: string
          preferred_time?: string
          service_type?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          ai_personality: string | null
          appointment_booking: boolean | null
          auto_forward: boolean | null
          business_address: string | null
          business_description: string | null
          business_hours: string | null
          business_name: string | null
          business_phone: string | null
          business_type: string | null
          common_questions: string | null
          created_at: string
          custom_greeting: string | null
          email_notifications: boolean | null
          forwarding_number: string | null
          id: string
          instant_alerts: boolean | null
          lead_capture: boolean | null
          max_call_duration: number | null
          push_notifications: boolean | null
          record_calls: boolean | null
          sms_notifications: boolean | null
          updated_at: string
          urgent_keywords: string | null
          user_id: string
        }
        Insert: {
          ai_personality?: string | null
          appointment_booking?: boolean | null
          auto_forward?: boolean | null
          business_address?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_type?: string | null
          common_questions?: string | null
          created_at?: string
          custom_greeting?: string | null
          email_notifications?: boolean | null
          forwarding_number?: string | null
          id?: string
          instant_alerts?: boolean | null
          lead_capture?: boolean | null
          max_call_duration?: number | null
          push_notifications?: boolean | null
          record_calls?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string
          urgent_keywords?: string | null
          user_id: string
        }
        Update: {
          ai_personality?: string | null
          appointment_booking?: boolean | null
          auto_forward?: boolean | null
          business_address?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_type?: string | null
          common_questions?: string | null
          created_at?: string
          custom_greeting?: string | null
          email_notifications?: boolean | null
          forwarding_number?: string | null
          id?: string
          instant_alerts?: boolean | null
          lead_capture?: boolean | null
          max_call_duration?: number | null
          push_notifications?: boolean | null
          record_calls?: boolean | null
          sms_notifications?: boolean | null
          updated_at?: string
          urgent_keywords?: string | null
          user_id?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          best_time_to_call: string | null
          call_duration: number | null
          call_status: string | null
          call_type: string
          caller_name: string
          created_at: string
          email: string | null
          id: string
          message: string
          phone_number: string
          recording_url: string | null
          transcript: string | null
          updated_at: string
          urgency_level: string
          user_id: string | null
        }
        Insert: {
          best_time_to_call?: string | null
          call_duration?: number | null
          call_status?: string | null
          call_type: string
          caller_name: string
          created_at?: string
          email?: string | null
          id?: string
          message: string
          phone_number: string
          recording_url?: string | null
          transcript?: string | null
          updated_at?: string
          urgency_level: string
          user_id?: string | null
        }
        Update: {
          best_time_to_call?: string | null
          call_duration?: number | null
          call_status?: string | null
          call_type?: string
          caller_name?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          phone_number?: string
          recording_url?: string | null
          transcript?: string | null
          updated_at?: string
          urgency_level?: string
          user_id?: string | null
        }
        Relationships: []
      }
      content_suggestions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          description: string | null
          id: string
          is_dismissed: boolean | null
          suggestion_type: string
          title: string
          trending_data: Json | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_dismissed?: boolean | null
          suggestion_type: string
          title: string
          trending_data?: Json | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_dismissed?: boolean | null
          suggestion_type?: string
          title?: string
          trending_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_accounts: {
        Row: {
          access_token: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          follower_count: number | null
          following_count: number | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          last_sync_at: string | null
          likes_count: number | null
          profile_image_url: string | null
          refresh_token: string | null
          tiktok_user_id: string | null
          tiktok_username: string
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
          video_count: number | null
        }
        Insert: {
          access_token?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_sync_at?: string | null
          likes_count?: number | null
          profile_image_url?: string | null
          refresh_token?: string | null
          tiktok_user_id?: string | null
          tiktok_username: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
          video_count?: number | null
        }
        Update: {
          access_token?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          last_sync_at?: string | null
          likes_count?: number | null
          profile_image_url?: string | null
          refresh_token?: string | null
          tiktok_user_id?: string | null
          tiktok_username?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
          video_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_analysis: {
        Row: {
          analysis_date: string
          average_engagement_rate: number | null
          category: string | null
          created_at: string | null
          growth_rate: number | null
          hashtag: string
          id: string
          peak_date: string | null
          region: string | null
          total_likes: number | null
          total_views: number | null
          trend_score: number | null
          video_count: number | null
        }
        Insert: {
          analysis_date: string
          average_engagement_rate?: number | null
          category?: string | null
          created_at?: string | null
          growth_rate?: number | null
          hashtag: string
          id?: string
          peak_date?: string | null
          region?: string | null
          total_likes?: number | null
          total_views?: number | null
          trend_score?: number | null
          video_count?: number | null
        }
        Update: {
          analysis_date?: string
          average_engagement_rate?: number | null
          category?: string | null
          created_at?: string | null
          growth_rate?: number | null
          hashtag?: string
          id?: string
          peak_date?: string | null
          region?: string | null
          total_likes?: number | null
          total_views?: number | null
          trend_score?: number | null
          video_count?: number | null
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          full_name: string | null
          id: string
          subscription_plan: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          subscription_plan?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      video_analytics: {
        Row: {
          comment_count: number | null
          created_at: string | null
          download_count: number | null
          engagement_rate: number | null
          id: string
          like_count: number | null
          play_count: number | null
          share_count: number | null
          snapshot_date: string
          video_id: string
          view_count: number | null
        }
        Insert: {
          comment_count?: number | null
          created_at?: string | null
          download_count?: number | null
          engagement_rate?: number | null
          id?: string
          like_count?: number | null
          play_count?: number | null
          share_count?: number | null
          snapshot_date: string
          video_id: string
          view_count?: number | null
        }
        Update: {
          comment_count?: number | null
          created_at?: string | null
          download_count?: number | null
          engagement_rate?: number | null
          id?: string
          like_count?: number | null
          play_count?: number | null
          share_count?: number | null
          snapshot_date?: string
          video_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_analytics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          comment_count: number | null
          created_at: string | null
          description: string | null
          download_count: number | null
          duration: number | null
          hashtags: string[] | null
          id: string
          like_count: number | null
          mentions: string[] | null
          music_author: string | null
          music_id: string | null
          music_title: string | null
          play_count: number | null
          published_at: string | null
          share_count: number | null
          thumbnail_url: string | null
          tiktok_account_id: string
          tiktok_video_id: string
          title: string | null
          updated_at: string | null
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          comment_count?: number | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          duration?: number | null
          hashtags?: string[] | null
          id?: string
          like_count?: number | null
          mentions?: string[] | null
          music_author?: string | null
          music_id?: string | null
          music_title?: string | null
          play_count?: number | null
          published_at?: string | null
          share_count?: number | null
          thumbnail_url?: string | null
          tiktok_account_id: string
          tiktok_video_id: string
          title?: string | null
          updated_at?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          comment_count?: number | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          duration?: number | null
          hashtags?: string[] | null
          id?: string
          like_count?: number | null
          mentions?: string[] | null
          music_author?: string | null
          music_id?: string | null
          music_title?: string | null
          play_count?: number | null
          published_at?: string | null
          share_count?: number | null
          thumbnail_url?: string | null
          tiktok_account_id?: string
          tiktok_video_id?: string
          title?: string | null
          updated_at?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_tiktok_account_id_fkey"
            columns: ["tiktok_account_id"]
            isOneToOne: false
            referencedRelation: "tiktok_accounts"
            referencedColumns: ["id"]
          },
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
