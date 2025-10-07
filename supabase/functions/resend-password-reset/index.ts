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

    // Send email in background without blocking the response
    EdgeRuntime.waitUntil((async () => {
      try {
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
          return;
        }

        // Send email using Resend
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: "Junie AI <noreply@getjunie.com>",
          to: [email],
          subject: "Reset your password",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
                <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                  <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                    <div style="text-align: center; margin-bottom: 32px;">
                      <img src="https://dff80483-0259-48f0-b1d3-d00ff4a377ae.lovableproject.com/lovable-uploads/junie-logo.png" alt="Junie AI" style="height: 40px; width: auto;" />
                    </div>
                    <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin-bottom: 16px; text-align: center;">Reset your password</h1>
                    <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin-bottom: 32px; text-align: center;">
                      We received a request to reset your password. Click the button below to create a new password:
                    </p>
                    <div style="text-align: center; margin-bottom: 32px;">
                      <a href="${data.properties.action_link}" 
                         style="display: inline-block; background-color: #8B5CF6; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 16px;">
                        Reset Password
                      </a>
                    </div>
                    <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; text-align: center; margin-bottom: 12px;">
                      If you didn't request a password reset, you can safely ignore this email.
                    </p>
                    <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; text-align: center;">
                      This link will expire in 1 hour for security reasons.
                    </p>
                  </div>
                  <div style="text-align: center; margin-top: 24px;">
                    <p style="color: #9ca3af; font-size: 12px;">
                      © ${new Date().getFullYear()} Junie AI. All rights reserved.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
        });

        if (emailError) {
          console.error("Error sending email:", emailError);
        } else {
          console.log("Email sent successfully via Resend:", emailData);
        }
      } catch (error) {
        console.error("Background email task error:", error);
      }
    })());

    // Return success immediately to prevent email enumeration
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
