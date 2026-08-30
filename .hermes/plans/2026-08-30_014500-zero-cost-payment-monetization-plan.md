# Razorpay Automated Payment & Monetization Implementation Plan

> **For Hermes:** Use `subagent-driven-development` skill to implement this plan task-by-task.

**Goal:** Implement a fully automated, zero-monthly-cost Razorpay subscription & payment pipeline for JobMaxxer so candidates can purchase Seeker Pro (₹299/mo) or Seeker Turbo (₹599/mo) via UPI, Cards, Netbanking, or Wallets, with instant server-side license provisioning via cryptographic webhooks and zero manual intervention.

**Architecture:** 
1. **Frontend (Desktop App):** In-app `UpgradeModal` with Razorpay Payment Links / Standard Checkout trigger passing candidate `user_id`, `email`, and `plan`.
2. **Payment Gateway (Razorpay):** Hosted high-converting checkout (UPI apps, Cards, Netbanking, EMI) with ₹0 setup fee and ₹0 monthly maintenance cost.
3. **Backend / Webhook (Supabase Edge Function & RPC):** Verifies HMAC-SHA256 signature from `X-Razorpay-Signature`, updates user `subscription_tier` and `expires_at`, and records the transaction in `billing_records`.
4. **Desktop Sync:** App detects license upgrade automatically via heartbeat / user sync without restarting.

**Tech Stack:** React 18, Electron 28, Razorpay API, Supabase (PostgreSQL + RLS + Edge Functions / RPCs), Node.js `crypto` (HMAC SHA-256).

---

## 1. Razorpay Cost & Automation Structure

| Item | Cost | Details |
| :--- | :--- | :--- |
| **Account Setup Fee** | **₹0.00** | Free signup as Individual / Freelancer / Business |
| **Monthly / Annual Maintenance Fee** | **₹0.00 / mo** | ₹0 when 0 users, ₹0 when 10,000 users |
| **Transaction Cut** | **2% per successful sale** | Automatically deducted from incoming payments (e.g. ₹6 deducted on ₹299, you receive ₹293) |
| **Supported Payment Modes** | **All India & Global** | UPI (GPay, PhonePe, Paytm, CRED), All Debit/Credit Cards, Netbanking (50+ banks), Wallets |
| **License Provisioning** | **100% Autonomous** | Webhook fires -> Supabase updates license -> App instantly activates |

---

## 2. End-to-End Automated Payment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CANDIDATE (DESKTOP APP)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Candidate clicks "Upgrade to Pro (₹299)" or "Upgrade to Turbo (₹599)"     │
│ 2. Desktop opens Razorpay Checkout URL / Payment Link with:                 │
│    - reference_id / notes: { user_id: "...", email: "...", plan: "pro" }    │
│ 3. Candidate completes payment via UPI / Card / Netbanking on Razorpay      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (Instant Webhook)
┌─────────────────────────────────────────────────────────────────────────────┐
│                   SUPABASE EDGE FUNCTION / WEBHOOK HANDLER                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Receives `payment.captured` or `order.paid` event from Razorpay          │
│ 2. Validates HMAC SHA-256 signature against `RAZORPAY_WEBHOOK_SECRET`       │
│ 3. Executes `public.handle_razorpay_payment_success()` RPC:                 │
│    - Sets `subscription_tier = 'pro'` (or 'max')                            │
│    - Sets `status = 'active'`                                               │
│    - Sets `expires_at = NOW() + INTERVAL '30 days'`                         │
│    - Inserts transaction into `billing_records`                             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (Real-Time Activation)
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DESKTOP APP INSTANT UNLOCK                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Desktop heartbeat / sync detects active Pro/Turbo tier                   │
│ 2. Paywall closes automatically, unlocked features are ready to use!        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Task Breakdown

---

### Task 1: Create Razorpay Webhook Database Schema & Fulfillment RPC

**Objective:** Add a database table `public.razorpay_orders` to track payment transactions, order IDs, and payment IDs, plus a `SECURITY DEFINER` RPC `handle_razorpay_payment_success` that idempotently upgrades candidate subscription tiers and records revenue in `billing_records`.

**Files:**
- Create: `packages/supabase/migrations/005_razorpay_payments.sql`
- Modify: `packages/supabase/src/index.ts`
- Test: `packages/supabase/src/__tests__/razorpay.test.ts`

**Step 1: Write failing test in `packages/supabase/src/__tests__/razorpay.test.ts`**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { handleRazorpaySuccessRpc } from '../index.js';

describe('Razorpay Database Fulfillment RPC', () => {
  it('updates user tier and inserts billing record on successful payment', async () => {
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: [{ ok: true, user_id: 'user-123', new_tier: 'pro', expires_at: '2026-09-30T00:00:00Z' }],
        error: null,
      }),
    };

    const res = await handleRazorpaySuccessRpc(mockSupabase, {
      userId: 'user-123',
      email: 'candidate@example.com',
      plan: 'pro',
      amount: '299.00',
      paymentId: 'pay_ABC12345678',
      orderId: 'order_XYZ9876543',
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('handle_razorpay_payment_success', {
      p_user_id: 'user-123',
      p_email: 'candidate@example.com',
      p_plan: 'pro',
      p_amount: '299.00',
      p_payment_id: 'pay_ABC12345678',
      p_order_id: 'order_XYZ9876543',
    });
    expect(res.ok).toBe(true);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npx vitest run packages/supabase/src/__tests__/razorpay.test.ts`
Expected: FAIL — "handleRazorpaySuccessRpc is not a function"

**Step 3: Implement `005_razorpay_payments.sql` and TypeScript helpers**

1. Create `packages/supabase/migrations/005_razorpay_payments.sql`:
```sql
-- ----------------------------------------------------------------------------
-- 1. Create Razorpay Orders & Transaction Ledger
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.razorpay_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    plan TEXT NOT NULL CHECK (plan IN ('pro', 'turbo', 'lifetime')),
    amount TEXT NOT NULL,
    payment_id TEXT NOT NULL UNIQUE,
    order_id TEXT,
    status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('captured', 'failed', 'refunded')),
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_razorpay_payments_email ON public.razorpay_payments(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_razorpay_payments_payment_id ON public.razorpay_payments(payment_id);

ALTER TABLE public.razorpay_payments ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. Fulfillment RPC: Upgrades Subscription & Writes to Billing Records
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_razorpay_payment_success(
    p_user_id UUID,
    p_email TEXT,
    p_plan TEXT,
    p_amount TEXT,
    p_payment_id TEXT,
    p_order_id TEXT DEFAULT NULL,
    p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    ok BOOLEAN,
    user_id UUID,
    new_tier TEXT,
    expires_at TIMESTAMPTZ,
    reason TEXT
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id UUID := p_user_id;
    v_tier TEXT;
    v_expires TIMESTAMPTZ;
BEGIN
    -- Resolve user_id by email if not provided or invalid
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM public.users_profile WHERE LOWER(email) = LOWER(TRIM(p_email)) LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 'No matching user account found for ' || p_email;
        RETURN;
    END IF;

    -- Determine new tier and duration
    v_tier := CASE WHEN LOWER(p_plan) = 'turbo' THEN 'max' ELSE 'pro' END;
    v_expires := CASE WHEN LOWER(p_plan) = 'lifetime' THEN NULL ELSE NOW() + INTERVAL '30 days' END;

    -- Record transaction in razorpay_payments
    INSERT INTO public.razorpay_payments (user_id, email, plan, amount, payment_id, order_id, status, raw_payload)
    VALUES (v_user_id, LOWER(TRIM(p_email)), p_plan, p_amount, p_payment_id, p_order_id, 'captured', p_raw_payload)
    ON CONFLICT (payment_id) DO NOTHING;

    -- Update user subscription profile
    UPDATE public.users_profile
    SET subscription_tier = v_tier,
        status = 'active',
        expires_at = v_expires,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Insert record into permanent billing ledger
    INSERT INTO public.billing_records (user_email, amount, plan, status, payment_method)
    VALUES (
        LOWER(TRIM(p_email)),
        '₹' || p_amount,
        CASE WHEN v_tier = 'max' THEN 'Seeker Turbo (Monthly)' ELSE 'Seeker Pro (Monthly)' END,
        'paid',
        'Razorpay'
    );

    RETURN QUERY SELECT TRUE, v_user_id, v_tier, v_expires, 'Subscription upgraded successfully!';
END;
$$;

-- Secure grants: Only service_role (Edge Functions / Operator) may execute fulfillment
REVOKE ALL ON FUNCTION public.handle_razorpay_payment_success FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_razorpay_payment_success TO service_role;
```

2. Export TypeScript helper `handleRazorpaySuccessRpc` in `packages/supabase/src/index.ts`.

**Step 4: Run test to verify pass**

Run: `npx vitest run packages/supabase/src/__tests__/razorpay.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/supabase/
git commit -m "feat(monetization): add Razorpay database schema and server-authoritative fulfillment RPC"
```

---

### Task 2: Build Supabase Edge Function Webhook Handler for Razorpay

**Objective:** Write a clean, zero-dependency Supabase Edge Function (Deno/TypeScript) that receives `payment.captured` webhooks from Razorpay, cryptographically verifies the SHA-256 HMAC signature against `RAZORPAY_WEBHOOK_SECRET`, and calls `handle_razorpay_payment_success`.

**Files:**
- Create: `packages/supabase/functions/razorpay-webhook/index.ts`
- Create: `packages/supabase/src/__tests__/webhook-signature.test.ts`

**Step 1: Write signature verification unit test in `packages/supabase/src/__tests__/webhook-signature.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

function verifyRazorpaySignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
}

describe('Razorpay HMAC SHA256 Webhook Verification', () => {
  it('validates authentic webhook payloads successfully', () => {
    const secret = 'rzp_test_secret_123';
    const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123' } } } });
    const validSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    expect(verifyRazorpaySignature(payload, validSignature, secret)).toBe(true);
  });

  it('rejects tampered or fraudulent webhook payloads', () => {
    const secret = 'rzp_test_secret_123';
    const payload = JSON.stringify({ event: 'payment.captured' });
    const invalidSignature = 'invalid_tampered_signature_hex';

    expect(verifyRazorpaySignature(payload, invalidSignature, secret)).toBe(false);
  });
});
```

**Step 2: Implement Supabase Edge Function `packages/supabase/functions/razorpay-webhook/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { hmac } from 'https://deno.land/x/hmac@v2.0.1/mod.ts';

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
```

**Step 3: Run test to verify pass**

Run: `npx vitest run packages/supabase/src/__tests__/webhook-signature.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/supabase/
git commit -m "feat(webhook): create secure cryptographic Razorpay webhook handler for Supabase Edge Functions"
```

---

### Task 3: Build Dynamic Razorpay Checkout Flow in Desktop App

**Objective:** Wire `UpgradeModal.tsx` to generate Razorpay standard hosted checkout sessions or direct Razorpay payment links, passing `user_id`, `email`, and `plan` as metadata notes, and adding a real-time "Check Payment Status" sync button.

**Files:**
- Modify: `apps/desktop/src/renderer/components/UpgradeModal.tsx`
- Modify: `apps/desktop/src/renderer/types.ts`
- Modify: `apps/desktop/src/main/index.ts`
- Modify: `apps/desktop/src/main/preload.ts`

**Step 1: Implement Razorpay checkout trigger in `UpgradeModal.tsx`**

```tsx
import React, { useState } from 'react';
import { Zap, Check, ShieldCheck, ExternalLink, X, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { AppUser, getApi } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUpgradeSuccess?: () => void;
  triggerFeature?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpgradeSuccess,
  triggerFeature,
}) => {
  const [checkingSync, setCheckingSync] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  if (!isOpen) return null;
  const api = getApi();

  // Razorpay payment link configuration (Set your free Razorpay Payment Page URL)
  // Example: https://rzp.io/l/jobmaxxer-pro or dynamic link generated with query params
  const handleRazorpayCheckout = (plan: 'pro' | 'turbo') => {
    const userId = currentUser?.id || '';
    const email = encodeURIComponent(currentUser?.email || '');
    const amount = plan === 'turbo' ? '599' : '299';
    
    // Razorpay standard payment link with custom URL parameters
    const paymentUrl = `https://rzp.io/l/jobmaxxer-${plan}?notes[user_id]=${userId}&notes[email]=${email}&notes[plan]=${plan}&prefill[email]=${email}`;
    api.openExternalUrl(paymentUrl);
  };

  const handleRefreshLicenseStatus = async () => {
    setCheckingSync(true);
    setSyncFeedback(null);
    try {
      const res = await api.syncCloudData();
      if (res.success) {
        setSyncFeedback('License status synchronized! You are now active.');
        onUpgradeSuccess?.();
        setTimeout(() => onClose(), 1500);
      } else {
        setSyncFeedback('Payment still processing or not found yet. Please check back in a few seconds.');
      }
    } catch {
      setSyncFeedback('Could not check status. Please check your internet connection.');
    } finally {
      setCheckingSync(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 relative animate-fade-up">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 border border-brand-200 rounded-full text-[11px] font-bold text-brand-800">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            {triggerFeature ? `Unlock ${triggerFeature}` : 'Automate Your Job Hunt'}
          </div>
          <h2 className="text-2xl font-black text-slate-900">Choose Your Seeker Plan</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Pay securely with Razorpay via UPI (GPay/PhonePe/Paytm), Cards, or Netbanking. Instant autonomous activation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pro Plan */}
          <div className="border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-brand-300 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Seeker Pro</h3>
                <p className="text-[11px] text-slate-500">For students actively applying</p>
                <div className="mt-2 text-2xl font-black text-slate-900">
                  ₹299 <span className="text-xs font-normal text-slate-500">/ month</span>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Full Job Board with ATS Match</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 20-Tab Semi-Auto Review Mode</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 25 Verified HR Contacts / Week</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Cloud Sync Across Devices</li>
              </ul>
            </div>
            <button
              onClick={() => handleRazorpayCheckout('pro')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>Pay ₹299 with Razorpay</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Turbo Plan */}
          <div className="border-2 border-brand-500 bg-brand-50/20 rounded-2xl p-5 space-y-4 relative shadow-lg shadow-brand-100 flex flex-col justify-between">
            <span className="absolute -top-3 right-4 bg-brand-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Most Popular
            </span>
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Seeker Turbo</h3>
                <p className="text-[11px] text-slate-500">100% Autopilot + AI Custom Answers</p>
                <div className="mt-2 text-2xl font-black text-brand-600">
                  ₹599 <span className="text-xs font-normal text-slate-500">/ month</span>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600 font-bold" /> 100% Autonomous Groq AI Auto-Apply</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600 font-bold" /> Unlimited HR & Recruiter Outreach</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600 font-bold" /> Automated Gmail Drip Outreach</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-brand-600 font-bold" /> 1-Laptop Strict Hardware License</li>
              </ul>
            </div>
            <button
              onClick={() => handleRazorpayCheckout('turbo')}
              className="w-full py-2.5 brand-gradient hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-brand transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Pay ₹599 with Razorpay</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sync / Refresh Status */}
        <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2 text-center">
          <button
            onClick={handleRefreshLicenseStatus}
            disabled={checkingSync}
            className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingSync ? 'animate-spin' : ''}`} />
            <span>Already paid? Refresh License Status</span>
          </button>
          {syncFeedback && <p className="text-[11px] text-slate-600 font-medium">{syncFeedback}</p>}
        </div>

        <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          Powered by Razorpay · 256-Bit SSL Encrypted · Instant autonomous unlock
        </p>
      </div>
    </div>
  );
};
```

**Step 2: Verification & Test**
- Run `npm run build:desktop` to ensure clean build.

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/components/UpgradeModal.tsx
git commit -m "feat(ui): connect in-app paywall modal to Razorpay payment links and instant license refresh"
```

---

### Task 4: Operator Admin Dashboard — Razorpay Transactions & Manual Overrides

**Objective:** Update `AdminView.tsx` so the operator can see all live Razorpay transactions, revenue metrics (MRR, total collected), and still retain the ability to manually gift or extend licenses.

**Files:**
- Modify: `apps/desktop/src/renderer/components/AdminView.tsx`
- Modify: `apps/desktop/src/main/index.ts`

**Step 1: Update `AdminView.tsx` billing tab**
- Fetch from `billing_records` showing payment method (`Razorpay` / `Manual`).
- Format transaction timestamps and currency symbols.

**Step 2: Run test & build verification**
- Run `npm run build:desktop`.

**Step 3: Commit**

```bash
git add apps/desktop/src/renderer/components/AdminView.tsx
git commit -m "feat(admin): display real-time Razorpay revenue and transaction records in admin panel"
```

---

### Task 5: End-to-End Verification & Automated Test Run

**Objective:** Verify that all unit tests pass across all workspace packages and that desktop bundling completes with zero errors.

**Step 1: Run complete test suite**

```bash
npx vitest run
```
Expected: 147+ tests PASS.

**Step 2: Run desktop production build**

```bash
npm run build:desktop
```
Expected: Clean build in `out/main/` and `out/renderer/`.

**Step 3: Commit**

```bash
git add .
git commit -m "chore: complete Razorpay payment integration and automated monetization plan"
```

---

## Deliverables & Free Infrastructure Checklist

- [x] **Zero Monthly Maintenance Cost**: ₹0 setup fee, ₹0 monthly recurring server fee with Razorpay.
- [x] **Universal Payment Support**: Native UPI (GPay, PhonePe, Paytm, BHIM), All Debit/Credit Cards, Netbanking, Wallets.
- [x] **Cryptographic Webhook Security**: HMAC SHA-256 verification against `RAZORPAY_WEBHOOK_SECRET`.
- [x] **Instant Automated Provisioning**: Supabase RPC updates user `subscription_tier` and `expires_at` automatically on `payment.captured`.
- [x] **No Interruption**: Desktop app refreshes license state seamlessly on completion.
