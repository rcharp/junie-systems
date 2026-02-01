import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_TEST_SECRET_KEY = Deno.env.get('STRIPE_TEST_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_subscription_id, stripe_customer_id, stripe_test_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_subscription_id) {
      throw new Error('No subscription found');
    }

    if (profile.stripe_customer_id || profile.stripe_test_customer_id) {
      return new Response(
        JSON.stringify({ message: 'Customer ID already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if we should use test mode
    const { data: stripeModeData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'stripe_sandbox_mode')
      .maybeSingle();
    
    const useTestMode = stripeModeData?.setting_value === true;
    const stripeKey = useTestMode ? STRIPE_TEST_SECRET_KEY : STRIPE_SECRET_KEY;

    // Fetch subscription from Stripe to get customer ID
    const subscriptionResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions/${profile.stripe_subscription_id}`,
      {
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
        },
      }
    );

    const subscription = await subscriptionResponse.json();

    if (subscription.error) {
      throw new Error(subscription.error.message);
    }

    const customerId = subscription.customer;

    if (!customerId) {
      throw new Error('No customer ID found in subscription');
    }

    // Update profile with customer ID
    const updateData: any = {};
    if (useTestMode) {
      updateData.stripe_test_customer_id = customerId;
    } else {
      updateData.stripe_customer_id = customerId;
    }

    await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('id', user.id);

    console.log(`Synced customer ID for user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, customerId }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error syncing customer ID:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
