import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature || !RAZORPAY_WEBHOOK_SECRET) {
      return new Response('Missing signature or webhook secret', { status: 400 });
    }

    const rawBody = await req.text();
    const generatedSignature = hmac('sha256', RAZORPAY_WEBHOOK_SECRET, rawBody, 'utf8', 'hex');

    if (generatedSignature !== signature) {
      console.error('[Razorpay Webhook] Invalid signature match!');
      return new Response('Invalid Signature', { status: 401 });
    }

    const event = JSON.parse(rawBody);
    console.log(`[Razorpay Webhook] Processing event: ${event.event}`);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const payment = event.payload?.payment?.entity;
      const notes = payment?.notes || {};
      const userId = notes.user_id || notes.userId || null;
      const email = payment.email || notes.email || '';
      const plan = notes.plan || (payment.amount >= 50000 ? 'turbo' : 'pro');
      const amountInRupees = (payment.amount / 100).toFixed(2);
      const paymentId = payment.id;
      const orderId = payment.order_id || null;

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data, error } = await supabase.rpc('handle_razorpay_payment_success', {
        p_user_id: userId,
        p_email: email,
        p_plan: plan,
        p_amount: amountInRupees,
        p_payment_id: paymentId,
        p_order_id: orderId,
        p_raw_payload: event,
      });

      if (error) {
        console.error('[Razorpay Webhook] Database RPC Error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }

      console.log('[Razorpay Webhook] Subscription successfully upgraded:', data);
      return new Response(JSON.stringify({ ok: true, data }), { status: 200 });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err: any) {
    console.error('[Razorpay Webhook] Exception:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});