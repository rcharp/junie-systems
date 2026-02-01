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

// Test mode direct links (Stripe payment links)
const TEST_PAYMENT_LINKS = {
  starter: 'https://buy.stripe.com/test_eVqeVcdE78XU0T08ft8g000',
  growth: 'https://buy.stripe.com/test_7sY9AScA32zw7ho8ft8g001',
  enterprise: 'https://buy.stripe.com/test_28E8wOfMf4HEgRYfHV8g002',
};

// Live production direct links (Stripe payment links)
const LIVE_PAYMENT_LINKS = {
  starter: 'https://buy.stripe.com/eVqeVcdE78XU0T08ft8g000',
  growth: 'https://buy.stripe.com/7sY9AScA32zw7ho8ft8g001',
  enterprise: 'https://buy.stripe.com/28E8wOfMf4HEgRYfHV8g002',
};

// Legacy price IDs (kept for reference, not used anymore)
const TEST_PRICE_IDS = {
  starter: 'price_1SDr4LC6VxOVUbRGntrsE4Jq',
  growth: 'price_1SDr4aC6VxOVUbRGnNLzJdcJ',
  enterprise: 'price_1SDr4lC6VxOVUbRGPeikgxmV',
};

const LIVE_PRICE_IDS = {
  starter: 'price_1SDDa4C6VxOVUbRGmwMZQzSs',
  growth: 'price_1SDDaMC6VxOVUbRGSicIm5JC',
  enterprise: 'price_1SDDaZC6VxOVUbRGGskqR0Rc',
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
    const PAYMENT_LINKS = useTestMode ? TEST_PAYMENT_LINKS : LIVE_PAYMENT_LINKS;
    
    console.log(`Using ${useTestMode ? 'TEST' : 'LIVE'} Stripe mode`);
    
    if (!plan || !PAYMENT_LINKS[plan as keyof typeof PAYMENT_LINKS]) {
      throw new Error('Invalid plan selected');
    }

    // Return the direct payment link instead of creating a checkout session
    const paymentUrl = PAYMENT_LINKS[plan as keyof typeof PAYMENT_LINKS];
    console.log('Returning payment link:', paymentUrl);

    return new Response(
      JSON.stringify({ url: paymentUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
