import { describe, it, expect } from 'vitest';
import { EmailVerificationPipeline } from '../pipeline.js';

describe('EmailVerificationPipeline', () => {
  describe('verifySyntax (Stage 1)', () => {
    it('returns true for valid email addresses', () => {
      expect(EmailVerificationPipeline.verifySyntax('user@example.com')).toBe(true);
      expect(EmailVerificationPipeline.verifySyntax('john.doe+test@domain.co.uk')).toBe(true);
    });

    it('returns false for invalid email addresses', () => {
      expect(EmailVerificationPipeline.verifySyntax('invalid-email')).toBe(false);
      expect(EmailVerificationPipeline.verifySyntax('user@domain')).toBe(false);
      expect(EmailVerificationPipeline.verifySyntax('@domain.com')).toBe(false);
    });
  });

  describe('verifyRoleAddress (Stage 2)', () => {
    it('returns false for generic/role prefixes', () => {
      expect(EmailVerificationPipeline.verifyRoleAddress('support@example.com')).toBe(false);
      expect(EmailVerificationPipeline.verifyRoleAddress('admin@example.com')).toBe(false);
      expect(EmailVerificationPipeline.verifyRoleAddress('no-reply@example.com')).toBe(false);
    });

    it('returns true for individual user prefixes', () => {
      expect(EmailVerificationPipeline.verifyRoleAddress('sajal@example.com')).toBe(true);
      expect(EmailVerificationPipeline.verifyRoleAddress('alex.smith@example.com')).toBe(true);
    });
  });

  describe('verify (Full Pipeline Integration)', () => {
    it('fails early at Stage 1 on syntax error', async () => {
      const res = await EmailVerificationPipeline.verify('bad-email');
      expect(res.isValid).toBe(false);
      expect(res.stageFailed).toBe(1);
    });

    it('fails at Stage 2 on role address', async () => {
      const res = await EmailVerificationPipeline.verify('support@company.com');
      expect(res.isValid).toBe(false);
      expect(res.stageFailed).toBe(2);
    });
  });
});