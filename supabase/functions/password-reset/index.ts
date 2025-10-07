import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  password_reset: {
    maxAttempts: 3, // Max 3 password reset requests
    windowMinutes: 60, // Per 60 minutes (1 hour)
  },
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get client IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    console.log(`Password reset request for ${email} from IP: ${clientIp}`);

    // Check rate limit for email
    const rateLimit = RATE_LIMITS.password_reset;
    const windowStart = new Date(Date.now() - rateLimit.windowMinutes * 60 * 1000);

    const { data: emailAttempts, error: emailCheckError } = await supabase
      .from("rate_limit_logs")
      .select("id")
      .eq("identifier", email.toLowerCase())
      .eq("action_type", "password_reset")
      .gte("created_at", windowStart.toISOString());

    if (emailCheckError) {
      console.error("Error checking email rate limit:", emailCheckError);
      throw emailCheckError;
    }

    if (emailAttempts && emailAttempts.length >= rateLimit.maxAttempts) {
      console.warn(`Rate limit exceeded for email: ${email}`);
      
      // Still return success to prevent email enumeration
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "If an account exists with this email, a password reset link has been sent."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check rate limit for IP (optional additional protection)
    const { data: ipAttempts } = await supabase
      .from("rate_limit_logs")
      .select("id")
      .eq("ip_address", clientIp)
      .eq("action_type", "password_reset")
      .gte("created_at", windowStart.toISOString());

    if (ipAttempts && ipAttempts.length >= rateLimit.maxAttempts * 2) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "If an account exists with this email, a password reset link has been sent."
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Log the attempt
    const { error: logError } = await supabase
      .from("rate_limit_logs")
      .insert({
        identifier: email.toLowerCase(),
        action_type: "password_reset",
        ip_address: clientIp,
        metadata: {
          user_agent: req.headers.get("user-agent"),
        },
      });

    if (logError) {
      console.error("Error logging rate limit attempt:", logError);
      // Don't fail the request if logging fails
    }

    // Send password reset email using Supabase Auth
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${req.headers.get("origin") || "https://id-preview--dff80483-0259-48f0-b1d3-d00ff4a377ae.lovable.app"}/reset-password`,
      }
    );

    if (resetError) {
      console.error("Error sending password reset email:", resetError);
      // Don't expose the error to prevent email enumeration
    }

    // Always return success to prevent email enumeration
    return new Response(
      JSON.stringify({ 
        success: true,
        message: "If an account exists with this email, a password reset link has been sent."
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in password-reset function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "An error occurred processing your request. Please try again later."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
