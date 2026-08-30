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