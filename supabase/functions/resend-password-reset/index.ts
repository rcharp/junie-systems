import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req: Request) => {
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

    console.log(`Password reset request for: ${email}`);

    // Generate password reset link using Supabase Auth Admin API
    const { data, error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${req.headers.get("origin") || "https://id-preview--dff80483-0259-48f0-b1d3-d00ff4a377ae.lovable.app"}/reset-password`,
      }
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
      // Don't expose the error to prevent email enumeration
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

    // Send email using Resend
    const { error: emailError } = await resend.emails.send({
      from: "Junie AI <onboarding@resend.dev>",
      to: [email],
      subject: "Reset your password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <h1 style="color: #333; font-size: 24px; margin-bottom: 20px;">Reset your password</h1>
              <p style="color: #555; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>
              <a href="${data.properties.action_link}" 
                 style="display: inline-block; background-color: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Reset Password
              </a>
              <p style="color: #888; font-size: 14px; margin-top: 30px; line-height: 1.5;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
              <p style="color: #888; font-size: 14px; margin-top: 20px; line-height: 1.5;">
                This link will expire in 1 hour for security reasons.
              </p>
            </div>
          </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
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
    console.error("Error in resend-password-reset function:", error);
    
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
