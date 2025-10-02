import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Live production price IDs
const LIVE_PRICE_IDS = {
  professional: 'price_1SDDa4C6VxOVUbRGmwMZQzSs',
  scale: 'price_1SDDaMC6VxOVUbRGSicIm5JC',
  growth: 'price_1SDDaZC6VxOVUbRGGskqR0Rc',
};

// Sandbox/test price IDs
const SANDBOX_PRICE_IDS = {
  professional: 'price_1SDqpKCFxjtRFu5wxezKVrlZ',
  scale: 'price_1SDqpcCFxjtRFu5w7gC0Ae7o',
  growth: 'price_1SDqprCFxjtRFu5wkcbEeGdW',
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
    
    // Check if we should use sandbox mode
    const { data: stripeModeData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'stripe_sandbox_mode')
      .maybeSingle();
    
    const useSandbox = stripeModeData?.setting_value === true;
    const PRICE_IDS = useSandbox ? SANDBOX_PRICE_IDS : LIVE_PRICE_IDS;
    
    console.log(`Using ${useSandbox ? 'SANDBOX' : 'LIVE'} Stripe mode`);
    
    if (!plan || !PRICE_IDS[plan as keyof typeof PRICE_IDS]) {
      throw new Error('Invalid plan selected');
    }

    // Get or create Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    console.log('Profile data:', profile);

    let customerId = profile?.stripe_customer_id;

    // Create customer if doesn't exist
    if (!customerId) {
      console.log('Creating new Stripe customer for user:', user.email);
      
      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
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

      // Update or insert profile with customer ID
      const { error: updateError } = await supabase
        .from('user_profiles')
        .upsert({ 
          id: user.id,
          stripe_customer_id: customerId 
        });

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
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
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
