import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonRes({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonRes({ error: 'Unauthorized' }, 401);

    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) return jsonRes({ error: 'Forbidden' }, 403);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) return jsonRes({ error: 'STRIPE_SECRET_KEY not configured' }, 500);

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

    const customers: Record<string, any> = {};
    const productNames = new Map<string, string>();
    let startingAfter: string | undefined;

    const getProductName = async (productRef: string | Stripe.Product | null | undefined) => {
      if (!productRef) return 'Unknown';
      if (typeof productRef !== 'string') return productRef.name || 'Unknown';
      if (productNames.has(productRef)) return productNames.get(productRef)!;

      try {
        const product = await stripe.products.retrieve(productRef);
        const name = product.name || 'Unknown';
        productNames.set(productRef, name);
        return name;
      } catch {
        return 'Unknown';
      }
    };

    for (let i = 0; i < 10; i++) {
      const subs = await stripe.subscriptions.list({
        status: 'all',
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.customer'],
      });

      for (const sub of subs.data) {
        const cust = sub.customer as Stripe.Customer;
        if (!cust || cust.deleted) continue;

        const item = sub.items.data[0];
        const price = item?.price;
        const plan = await getProductName(price?.product);
        const existing = customers[cust.id];
        const isActive = sub.status === 'active' || sub.status === 'trialing';

        if (!existing || (isActive && !existing.isActive)) {
          customers[cust.id] = {
            customerId: cust.id,
            name: cust.name || '',
            email: cust.email || '',
            plan,
            amount: price?.unit_amount ? price.unit_amount / 100 : null,
            currency: price?.currency || 'usd',
            interval: price?.recurring?.interval || null,
            status: sub.status,
            isActive,
            currentPeriodEnd: sub.current_period_end,
          };
        }
      }

      if (!subs.has_more) break;
      startingAfter = subs.data[subs.data.length - 1]?.id;
    }

    const list = Object.values(customers).sort((a: any, b: any) =>
      (a.name || a.email).localeCompare(b.name || b.email)
    );

    return jsonRes({ customers: list, total: list.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return jsonRes({ error: msg }, 500);
  }
});

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
