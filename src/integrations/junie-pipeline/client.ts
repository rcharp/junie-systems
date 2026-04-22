// Dedicated Supabase client for the Junie Personalized Website pipeline backend.
// This intentionally points to a DIFFERENT Supabase project than the main app's
// `src/integrations/supabase/client.ts`. Do not merge them.
import { createClient } from "@supabase/supabase-js";

export const JUNIE_SUPABASE_URL = "https://dmwjunlaahdyldoshyye.supabase.co";
export const JUNIE_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtd2p1bmxhYWhkeWxkb3NoeXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MDg5MDYsImV4cCI6MjA4NzM4NDkwNn0.NJB65s7-JGBR_a_ayY-S2mQ2eP4_1wJNPmIvttNZlCg";
export const JUNIE_SUPABASE_PROJECT_ID = "dmwjunlaahdyldoshyye";

// Minimal hand-typed Database interface — kept loose intentionally so the copied
// pages (which pass varied shapes via `as any`) keep compiling without the
// generated types from the source project.
export interface JuniePipelineDatabase {
  public: {
    Tables: {
      pipeline_runs: {
        Row: {
          id: string;
          status: string;
          total_companies: number;
          created_at: string;
          pause_after_steps?: string | null;
        };
        Insert: Partial<JuniePipelineDatabase["public"]["Tables"]["pipeline_runs"]["Row"]> & {
          status: string;
          total_companies: number;
        };
        Update: Partial<JuniePipelineDatabase["public"]["Tables"]["pipeline_runs"]["Row"]>;
        Relationships: [];
      };
      pipeline_companies: {
        Row: {
          id: string;
          run_id: string;
          name: string;
          url: string;
          industry: string | null;
          contact_name: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          phone_number: string | null;
          status: string;
          current_step: string | null;
          site_url: string | null;
          screen_url: string | null;
          audio_url: string | null;
          video_url: string | null;
          logo_url: string | null;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<JuniePipelineDatabase["public"]["Tables"]["pipeline_companies"]["Row"]> & {
          run_id: string;
          name: string;
          url: string;
        };
        Update: Partial<JuniePipelineDatabase["public"]["Tables"]["pipeline_companies"]["Row"]>;
        Relationships: [];
      };
      settings: {
        Row: { key: string; value: string };
        Insert: { key: string; value: string };
        Update: Partial<{ key: string; value: string }>;
        Relationships: [];
      };
      usage_logs: {
        Row: {
          id: string;
          service: string;
          operation: string;
          tokens_used: number | null;
          characters_used: number | null;
          duration_seconds: string | number | null;
          created_at: string;
        };
        Insert: Partial<JuniePipelineDatabase["public"]["Tables"]["usage_logs"]["Row"]> & {
          service: string;
          operation: string;
        };
        Update: Partial<JuniePipelineDatabase["public"]["Tables"]["usage_logs"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export const supabase = createClient<JuniePipelineDatabase>(
  JUNIE_SUPABASE_URL,
  JUNIE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      // Use a separate storage key so the pipeline session never collides with
      // the main app's auth session.
      storageKey: "junie-pipeline-auth",
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
