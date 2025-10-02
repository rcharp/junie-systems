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
          calendar_event_id: string | null
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
          calendar_event_id?: string | null
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
          calendar_event_id?: string | null
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
      business_data_requests: {
        Row: {
          business_id: string
          created_at: string
          id: string
          ip_address: unknown | null
          request_data: Json | null
          request_source: string
          request_type: string
          response_data: Json | null
          response_status: number
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          request_data?: Json | null
          request_source?: string
          request_type?: string
          response_data?: Json | null
          response_status?: number
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          request_data?: Json | null
          request_source?: string
          request_type?: string
          response_data?: Json | null
          response_status?: number
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          ai_personality: string | null
          appointment_booking: boolean | null
          auto_forward: boolean | null
          business_address: string | null
          business_address_state_full: string | null
          business_description: string | null
          business_hours: string | null
          business_name: string | null
          business_phone: string | null
          business_timezone: string | null
          business_timezone_offset: string | null
          business_type: string | null
          business_type_full_name: string | null
          business_website: string | null
          common_questions: string | null
          created_at: string
          custom_greeting: string | null
          email_notifications: boolean | null
          forwarding_number: string | null
          id: string
          instant_alerts: boolean | null
          lead_capture: boolean | null
          max_call_duration: number | null
          pricing_structure: string | null
          push_notifications: boolean | null
          record_calls: boolean | null
          services_offered: string | null
          sms_notifications: boolean | null
          twilio_phone_number: string | null
          updated_at: string
          urgent_keywords: string | null
          user_id: string
        }
        Insert: {
          ai_personality?: string | null
          appointment_booking?: boolean | null
          auto_forward?: boolean | null
          business_address?: string | null
          business_address_state_full?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_timezone?: string | null
          business_timezone_offset?: string | null
          business_type?: string | null
          business_type_full_name?: string | null
          business_website?: string | null
          common_questions?: string | null
          created_at?: string
          custom_greeting?: string | null
          email_notifications?: boolean | null
          forwarding_number?: string | null
          id?: string
          instant_alerts?: boolean | null
          lead_capture?: boolean | null
          max_call_duration?: number | null
          pricing_structure?: string | null
          push_notifications?: boolean | null
          record_calls?: boolean | null
          services_offered?: string | null
          sms_notifications?: boolean | null
          twilio_phone_number?: string | null
          updated_at?: string
          urgent_keywords?: string | null
          user_id: string
        }
        Update: {
          ai_personality?: string | null
          appointment_booking?: boolean | null
          auto_forward?: boolean | null
          business_address?: string | null
          business_address_state_full?: string | null
          business_description?: string | null
          business_hours?: string | null
          business_name?: string | null
          business_phone?: string | null
          business_timezone?: string | null
          business_timezone_offset?: string | null
          business_type?: string | null
          business_type_full_name?: string | null
          business_website?: string | null
          common_questions?: string | null
          created_at?: string
          custom_greeting?: string | null
          email_notifications?: boolean | null
          forwarding_number?: string | null
          id?: string
          instant_alerts?: boolean | null
          lead_capture?: boolean | null
          max_call_duration?: number | null
          pricing_structure?: string | null
          push_notifications?: boolean | null
          record_calls?: boolean | null
          services_offered?: string | null
          sms_notifications?: boolean | null
          twilio_phone_number?: string | null
          updated_at?: string
          urgent_keywords?: string | null
          user_id?: string
        }
        Relationships: []
      }
      business_types: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          label: string
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          appointment_date_time: string | null
          appointment_scheduled: boolean | null
          best_time_to_call: string | null
          business_id: string | null
          business_name: string | null
          business_type: string | null
          call_duration: number | null
          call_id: string | null
          call_status: string | null
          call_summary: string | null
          call_type: string
          caller_name: string
          created_at: string
          email: string | null
          ended_at: string | null
          id: string
          message: string
          metadata: Json | null
          phone_number: string
          provider: string | null
          recording_url: string | null
          service_address: string | null
          transcript: string | null
          updated_at: string
          urgency_level: string
          user_id: string | null
        }
        Insert: {
          appointment_date_time?: string | null
          appointment_scheduled?: boolean | null
          best_time_to_call?: string | null
          business_id?: string | null
          business_name?: string | null
          business_type?: string | null
          call_duration?: number | null
          call_id?: string | null
          call_status?: string | null
          call_summary?: string | null
          call_type: string
          caller_name: string
          created_at?: string
          email?: string | null
          ended_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          phone_number: string
          provider?: string | null
          recording_url?: string | null
          service_address?: string | null
          transcript?: string | null
          updated_at?: string
          urgency_level: string
          user_id?: string | null
        }
        Update: {
          appointment_date_time?: string | null
          appointment_scheduled?: boolean | null
          best_time_to_call?: string | null
          business_id?: string | null
          business_name?: string | null
          business_type?: string | null
          call_duration?: number | null
          call_id?: string | null
          call_status?: string | null
          call_summary?: string | null
          call_type?: string
          caller_name?: string
          created_at?: string
          email?: string | null
          ended_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          phone_number?: string
          provider?: string | null
          recording_url?: string | null
          service_address?: string | null
          transcript?: string | null
          updated_at?: string
          urgency_level?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_call_logs_business_id"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      call_messages: {
        Row: {
          best_time_to_call: string | null
          call_id: string | null
          call_type: string
          caller_name: string
          created_at: string
          email: string | null
          id: string
          message: string
          phone_number: string
          status: string | null
          updated_at: string
          urgency_level: string
          user_id: string
        }
        Insert: {
          best_time_to_call?: string | null
          call_id?: string | null
          call_type: string
          caller_name: string
          created_at?: string
          email?: string | null
          id?: string
          message: string
          phone_number: string
          status?: string | null
          updated_at?: string
          urgency_level?: string
          user_id: string
        }
        Update: {
          best_time_to_call?: string | null
          call_id?: string | null
          call_type?: string
          caller_name?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          phone_number?: string
          status?: string | null
          updated_at?: string
          urgency_level?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_settings: {
        Row: {
          appointment_duration: number | null
          availability_hours: Json | null
          calendar_id: string | null
          created_at: string
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          expires_at: string | null
          id: string
          is_connected: boolean
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_duration?: number | null
          availability_hours?: Json | null
          calendar_id?: string | null
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          expires_at?: string | null
          id?: string
          is_connected?: boolean
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_duration?: number | null
          availability_hours?: Json | null
          calendar_id?: string | null
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          expires_at?: string | null
          id?: string
          is_connected?: boolean
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          justification: string | null
          record_id: string | null
          sensitive_data_accessed: boolean | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          justification?: string | null
          record_id?: string | null
          sensitive_data_accessed?: boolean | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          justification?: string | null
          record_id?: string | null
          sensitive_data_accessed?: boolean | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          price: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          price?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          completed: boolean
          created_at: string
          display_order: number
          id: string
          priority: string
          text: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean
          created_at?: string
          display_order?: number
          id?: string
          priority?: string
          text: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean
          created_at?: string
          display_order?: number
          id?: string
          priority?: string
          text?: string
          updated_at?: string
          user_id?: string | null
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
          setup_completed: boolean | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_test_customer_id: string | null
          subscription_plan: string | null
          subscription_status: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
          webhook_id: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          setup_completed?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_test_customer_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          webhook_id?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          setup_completed?: boolean | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_test_customer_id?: string | null
          subscription_plan?: string | null
          subscription_status?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          webhook_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      google_calendar_settings_safe: {
        Row: {
          appointment_duration: number | null
          availability_hours: Json | null
          calendar_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          is_connected: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          appointment_duration?: number | null
          availability_hours?: Json | null
          calendar_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          is_connected?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          appointment_duration?: number | null
          availability_hours?: Json | null
          calendar_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          is_connected?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      authorize_admin_customer_data_access: {
        Args: { justification: string; target_appointment_id?: string }
        Returns: boolean
      }
      decrypt_token: {
        Args: { encoded_token: string }
        Returns: string
      }
      encrypt_token: {
        Args: { token: string }
        Returns: string
      }
      exec_sql: {
        Args: { sql: string }
        Returns: undefined
      }
      get_appointments_summary: {
        Args: { target_user_id?: string }
        Returns: {
          caller_name_masked: string
          contact_masked: string
          created_at: string
          id: string
          preferred_date: string
          preferred_time: string
          service_type: string
          status: string
        }[]
      }
      get_call_logs_for_admin: {
        Args: { justification?: string; target_business_id?: string }
        Returns: {
          business_id: string
          call_duration: number
          call_status: string
          call_type: string
          caller_name: string
          created_at: string
          email: string
          id: string
          message_preview: string
          phone_number: string
          transcript_preview: string
          urgency_level: string
        }[]
      }
      get_google_calendar_tokens: {
        Args: { p_user_id: string }
        Returns: {
          access_token: string
          appointment_duration: number
          availability_hours: Json
          calendar_id: string
          created_at: string
          expires_at: string
          id: string
          is_connected: boolean
          refresh_token: string
          timezone: string
          updated_at: string
          user_id: string
        }[]
      }
      get_secure_appointments_for_admin: {
        Args: { target_user_id?: string }
        Returns: {
          caller_name_masked: string
          contact_masked: string
          created_at: string
          id: string
          notes_preview: string
          preferred_date: string
          preferred_time: string
          service_type: string
          status: string
          user_id: string
        }[]
      }
      get_tiktok_tokens: {
        Args: { account_id: string }
        Returns: Json
      }
      get_user_id_by_email: {
        Args: { _email: string }
        Returns: string
      }
      get_user_id_by_webhook_id: {
        Args: { _webhook_id: string }
        Returns: string
      }
      get_users_with_business_ids_for_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          business_id: string
          company_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          subscription_plan: string
        }[]
      }
      get_users_with_emails_for_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_name: string
          created_at: string
          email: string
          full_name: string
          id: string
          webhook_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_security_event: {
        Args: { event_data?: Json; event_type: string }
        Returns: undefined
      }
      store_tiktok_tokens: {
        Args: {
          access_token: string
          account_id: string
          refresh_token: string
        }
        Returns: string
      }
      update_google_calendar_tokens: {
        Args: {
          p_access_token?: string
          p_expires_at?: string
          p_refresh_token?: string
          p_user_id: string
        }
        Returns: boolean
      }
      update_tiktok_tokens: {
        Args: {
          account_id: string
          new_access_token?: string
          new_refresh_token?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
