import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        }
      }
    );

    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const userId = user.id;

    // Get user profile to find Stripe customer IDs
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('stripe_customer_id, stripe_subscription_id, stripe_test_customer_id')
      .eq('id', userId)
      .single();

    // Get business settings to find Twilio phone number
    const { data: businessSettings } = await supabaseClient
      .from('business_settings')
      .select('twilio_phone_number')
      .eq('user_id', userId)
      .single();

    // Cancel Stripe subscriptions and delete customers (both live and test)
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });
    const stripeTest = new Stripe(Deno.env.get('STRIPE_SANDBOX_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Handle live mode Stripe customer
    if (profile?.stripe_customer_id) {
      try {
        // Cancel subscription if it exists
        if (profile.stripe_subscription_id) {
          await stripe.subscriptions.cancel(profile.stripe_subscription_id);
          console.log('Live Stripe subscription cancelled:', profile.stripe_subscription_id);
        }

        // Delete customer
        await stripe.customers.del(profile.stripe_customer_id);
        console.log('Live Stripe customer deleted:', profile.stripe_customer_id);
      } catch (stripeError) {
        console.error('Live Stripe deletion error:', stripeError);
        // Continue with account deletion even if Stripe fails
      }
    }

    // Handle test mode Stripe customer
    if (profile?.stripe_test_customer_id) {
      try {
        // List and cancel all subscriptions for test customer
        const subscriptions = await stripeTest.subscriptions.list({
          customer: profile.stripe_test_customer_id,
        });
        
        for (const subscription of subscriptions.data) {
          await stripeTest.subscriptions.cancel(subscription.id);
          console.log('Test Stripe subscription cancelled:', subscription.id);
        }

        // Delete test customer
        await stripeTest.customers.del(profile.stripe_test_customer_id);
        console.log('Test Stripe customer deleted:', profile.stripe_test_customer_id);
      } catch (stripeError) {
        console.error('Test Stripe deletion error:', stripeError);
        // Continue with account deletion even if Stripe fails
      }
    }

    // Release Twilio phone number if it exists
    if (businessSettings?.twilio_phone_number) {
      try {
        const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        
        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(businessSettings.twilio_phone_number)}`,
          {
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            },
          }
        );

        const phoneNumbers = await twilioResponse.json();
        
        if (phoneNumbers.incoming_phone_numbers && phoneNumbers.incoming_phone_numbers.length > 0) {
          const phoneNumberSid = phoneNumbers.incoming_phone_numbers[0].sid;
          
          await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              },
            }
          );
          
          console.log('Twilio phone number released:', businessSettings.twilio_phone_number);
        }
      } catch (twilioError) {
        console.error('Twilio deletion error:', twilioError);
        // Continue with account deletion even if Twilio fails
      }
    }

    // Delete security audit logs first (not cascaded automatically)
    const { error: auditDeleteError } = await supabaseClient
      .from('security_audit_log')
      .delete()
      .eq('user_id', userId);

    if (auditDeleteError) {
      console.error('Error deleting audit logs:', auditDeleteError);
      // Continue anyway - audit logs shouldn't block account deletion
    }

    // Delete user activity logs
    const { error: activityDeleteError } = await supabaseClient
      .from('user_activity')
      .delete()
      .eq('user_id', userId);

    if (activityDeleteError) {
      console.error('Error deleting activity logs:', activityDeleteError);
      // Continue anyway
    }

    // Delete user data (cascading deletes will handle related tables)
    // The auth.users deletion will cascade to user_profiles and other tables
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error deleting account:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

// Helper to create Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
