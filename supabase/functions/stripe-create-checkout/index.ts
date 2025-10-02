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

// Test mode price IDs (replace with your actual Stripe test price IDs)
// To get these: Go to Stripe Dashboard → Products → Create recurring prices
// Copy the price IDs that start with price_test_...
const TEST_PRICE_IDS = {
  professional: 'price_test_YOUR_PROFESSIONAL_PRICE_ID', // Replace with your actual test price ID
  scale: 'price_test_YOUR_SCALE_PRICE_ID', // Replace with your actual test price ID
  growth: 'price_test_YOUR_GROWTH_PRICE_ID', // Replace with your actual test price ID
};

// Live production price IDs (replace when you're ready to go live)
const LIVE_PRICE_IDS = {
  professional: 'price_YOUR_PROFESSIONAL_PRICE_ID',
  scale: 'price_YOUR_SCALE_PRICE_ID',
  growth: 'price_YOUR_GROWTH_PRICE_ID',
};

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

    const { plan } = await req.json();
    
    // Check if we should use test mode
    const { data: stripeModeData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'stripe_sandbox_mode')
      .maybeSingle();
    
    const useTestMode = stripeModeData?.setting_value === true;
    const PRICE_IDS = useTestMode ? TEST_PRICE_IDS : LIVE_PRICE_IDS;
    const stripeKey = useTestMode ? STRIPE_TEST_SECRET_KEY : STRIPE_SECRET_KEY;
    
    console.log(`Using ${useTestMode ? 'TEST' : 'LIVE'} Stripe mode`);
    
    if (!plan || !PRICE_IDS[plan as keyof typeof PRICE_IDS]) {
      throw new Error('Invalid plan selected');
    }

    // Get or create Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id, stripe_test_customer_id')
      .eq('id', user.id)
      .single();

    console.log('Profile data:', profile);

    // Use appropriate customer ID based on mode
    let customerId = useTestMode ? profile?.stripe_test_customer_id : profile?.stripe_customer_id;

    // Verify customer exists in Stripe if we have an ID
    if (customerId) {
      console.log('Verifying Stripe customer exists:', customerId);
      const verifyResponse = await fetch(`https://api.stripe.com/v1/customers/${customerId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
        },
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || verifyData.deleted) {
        console.log('Stripe customer not found or deleted, will create new one');
        customerId = null; // Customer doesn't exist, need to create new one
        
        // Clear the invalid customer ID from the profile
        const clearData = useTestMode 
          ? { stripe_test_customer_id: null }
          : { stripe_customer_id: null };
        
        await supabase
          .from('user_profiles')
          .update(clearData)
          .eq('id', user.id);
      } else {
        console.log('Stripe customer verified:', customerId);
      }
    }

    // Create customer if doesn't exist or verification failed
    if (!customerId) {
      console.log('Creating new Stripe customer for user:', user.email);
      
      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email!,
          'metadata[supabase_user_id]': user.id,
        }),
      });

      const customer = await customerResponse.json();
      
      if (customer.error) {
        console.error('Stripe customer creation error:', customer.error);
        throw new Error(`Failed to create Stripe customer: ${customer.error.message}`);
      }

      customerId = customer.id;
      console.log('Created Stripe customer:', customerId);

      // Update or insert profile with customer ID (test or live based on mode)
      const updateData = useTestMode 
        ? { id: user.id, stripe_test_customer_id: customerId }
        : { id: user.id, stripe_customer_id: customerId };
      
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert(updateData);

      if (updateError) {
        console.error('Error updating profile:', updateError);
      }
    }

    if (!customerId) {
      throw new Error('Failed to get or create Stripe customer');
    }

    // Create checkout session
    const checkoutResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        'line_items[0][price]': PRICE_IDS[plan as keyof typeof PRICE_IDS],
        'line_items[0][quantity]': '1',
        mode: 'subscription',
        success_url: `${req.headers.get('origin')}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.get('origin')}/pricing`,
        'metadata[supabase_user_id]': user.id,
        'metadata[plan]': plan,
      }),
    });

    const session = await checkoutResponse.json();

    if (session.error) {
      console.error('Stripe checkout session error:', session.error);
      throw new Error(session.error.message);
    }

    if (!session.url) {
      console.error('No URL returned from Stripe:', session);
      throw new Error('Stripe did not return a checkout URL');
    }

    console.log('Successfully created checkout session with URL:', session.url);

    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
