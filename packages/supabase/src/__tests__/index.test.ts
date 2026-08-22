import { describe, it, expect, vi } from 'vitest';
import { sendSessionHeartbeat, getSupabaseClient } from '../index.js';

describe('Supabase Package Unit Tests', () => {
  describe('getSupabaseClient', () => {
    it('creates a client instance with provided URL and key', () => {
      const client = getSupabaseClient('https://mock.supabase.co', 'mock-key');
      expect(client).toBeDefined();
      expect(typeof client.rpc).toBe('function');
    });
  });

  describe('sendSessionHeartbeat', () => {
    it('returns valid true when RPC call succeeds with valid session', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: { is_valid: true },
          error: null,
        }),
      };

      const res = await sendSessionHeartbeat(
        mockSupabase,
        'user-123',
        'token-abc',
        '192.168.1.1',
        'fp-device-1'
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('verify_and_update_session', {
        p_user_id: 'user-123',
        p_session_token: 'token-abc',
        p_client_ip: '192.168.1.1',
        p_device_fingerprint: 'fp-device-1',
      });
      expect(res.valid).toBe(true);
      expect(res.reason).toBeUndefined();
    });

    it('returns valid false when RPC reports session invalid due to IP change', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: { is_valid: false, reason: 'IP conflict detected' },
          error: null,
        }),
      };

      const res = await sendSessionHeartbeat(
        mockSupabase,
        'user-123',
        'token-abc',
        '10.0.0.1',
        'fp-device-1'
      );

      expect(res.valid).toBe(false);
      expect(res.reason).toBe('IP conflict detected');
    });

    it('handles RPC errors gracefully and returns valid false', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database RPC execution failed' },
        }),
      };

      const res = await sendSessionHeartbeat(
        mockSupabase,
        'user-123',
        'token-abc',
        '192.168.1.1',
        'fp-device-1'
      );

      expect(res.valid).toBe(false);
      expect(res.reason).toBe('Database RPC execution failed');
    });

    it('handles network or unexpected exceptions cleanly', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockRejectedValue(new Error('Network connection offline')),
      };

      const res = await sendSessionHeartbeat(
        mockSupabase,
        'user-123',
        'token-abc',
        '192.168.1.1',
        'fp-device-1'
      );

      expect(res.valid).toBe(false);
      expect(res.reason).toContain('Network connection offline');
    });
  });
});