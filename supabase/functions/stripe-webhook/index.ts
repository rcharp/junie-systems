import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!signature || !STRIPE_WEBHOOK_SECRET) {
      console.error('Missing signature or webhook secret');
      return new Response('Webhook signature required', { status: 400 });
    }

    // Verify webhook signature
    const event = await verifyStripeWebhook(body, signature);
    
    console.log('Processing Stripe webhook event:', event.type);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          await supabase
            .from('user_profiles')
            .update({
              subscription_plan: plan,
              subscription_status: 'active',
              stripe_subscription_id: session.subscription,
            })
            .eq('id', userId);

          console.log(`Updated user ${userId} to ${plan} plan`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Get user by customer ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          const status = subscription.status === 'active' ? 'active' : 
                        subscription.status === 'canceled' ? 'canceled' : 
                        subscription.status;

          await supabase
            .from('user_profiles')
            .update({
              subscription_status: status,
              stripe_subscription_id: subscription.id,
            })
            .eq('id', profile.id);

          console.log(`Updated subscription status for user ${profile.id} to ${status}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Get user by customer ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          await supabase
            .from('user_profiles')
            .update({
              subscription_plan: 'free',
              subscription_status: 'canceled',
              stripe_subscription_id: null,
            })
            .eq('id', profile.id);

          console.log(`Cancelled subscription for user ${profile.id}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Get user by customer ID
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (profile) {
          await supabase
            .from('user_profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', profile.id);

          console.log(`Payment failed for user ${profile.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function verifyStripeWebhook(body: string, signature: string) {
  const encoder = new TextEncoder();
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
  const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !sig) {
    throw new Error('Invalid signature format');
  }

  const signedPayload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const expectedSigHex = Array.from(new Uint8Array(expectedSig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (expectedSigHex !== sig) {
    throw new Error('Invalid signature');
  }

  // Check timestamp (prevent replay attacks)
  const currentTime = Math.floor(Date.now() / 1000);
  const timestampInt = parseInt(timestamp);
  if (currentTime - timestampInt > 300) { // 5 minutes tolerance
    throw new Error('Timestamp too old');
  }

  return JSON.parse(body);
}
