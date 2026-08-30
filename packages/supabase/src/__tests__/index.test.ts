import { describe, it, expect, vi } from 'vitest';
import {
  sendSessionHeartbeat,
  getSupabaseClient,
  registerDeviceSession,
  syncPullUserData,
  syncPushUserProfile,
  syncPushApplication,
  syncPushSavedJob,
  syncRemoveSavedJob,
  syncPushResume,
  syncDeleteResume
} from '../index.js';

describe('Supabase Package Unit Tests', () => {
  describe('getSupabaseClient', () => {
    it('creates a client instance with provided URL and key', () => {
      const client = getSupabaseClient('https://mock.supabase.co', 'mock-key');
      expect(client).toBeDefined();
      expect(typeof client.rpc).toBe('function');
    });
  });

  describe('registerDeviceSession', () => {
    it('successfully registers device session with no conflict', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{ ok: true, conflict: false, reason: 'Session registered successfully' }],
          error: null,
        }),
      };

      const res = await registerDeviceSession(
        mockSupabase,
        'user-1',
        'tok-1',
        'fp-laptop-1',
        'MacBook Pro',
        '1.2.3.4',
        false
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('register_device_session', {
        p_user_id: 'user-1',
        p_session_token: 'tok-1',
        p_device_fingerprint: 'fp-laptop-1',
        p_device_name: 'MacBook Pro',
        p_client_ip: '1.2.3.4',
        p_force_takeover: false,
      });
      expect(res.ok).toBe(true);
      expect(res.conflict).toBe(false);
    });

    it('detects active device conflict and returns activeDevice info', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{ ok: false, conflict: true, active_device: 'Dell XPS 15', reason: 'Account active on another device' }],
          error: null,
        }),
      };

      const res = await registerDeviceSession(
        mockSupabase,
        'user-1',
        'tok-1',
        'fp-laptop-2',
        'HP Pavilion',
        '1.2.3.4',
        false
      );

      expect(res.ok).toBe(false);
      expect(res.conflict).toBe(true);
      expect(res.activeDevice).toBe('Dell XPS 15');
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

    it('returns valid false when RPC reports session invalid due to device conflict', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: { is_valid: false, reason: 'Device conflict detected' },
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
      expect(res.reason).toBe('Device conflict detected');
    });
  });

  describe('syncPullUserData', () => {
    it('successfully pulls cloud user data', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{
            ok: true,
            profile: { first_name: 'John', tech_stack: 'React, Node' },
            applications: [{ company: 'Google', title: 'SWE', apply_url: 'https://google.com' }],
            saved_jobs: [{ title: 'Frontend Engineer', company: 'Stripe', apply_url: 'https://stripe.com' }],
            resumes: [{ name: 'SWE Resume', is_default: true }]
          }],
          error: null,
        }),
      };

      const res = await syncPullUserData(mockSupabase, 'user-1', 'tok-1', 'fp-1');
      expect(res.ok).toBe(true);
      expect(res.data?.profile).toEqual({ first_name: 'John', tech_stack: 'React, Node' });
      expect(res.data?.applications).toHaveLength(1);
      expect(res.data?.savedJobs).toHaveLength(1);
      expect(res.data?.resumes).toHaveLength(1);
    });
  });

  describe('syncPushUserProfile', () => {
    it('pushes profile data to cloud', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{ ok: true }],
          error: null,
        }),
      };

      const res = await syncPushUserProfile(mockSupabase, 'user-1', 'tok-1', 'fp-1', {
        first_name: 'Jane',
        desired_title: 'Full Stack Engineer'
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('sync_push_user_profile', {
        p_user_id: 'user-1',
        p_session_token: 'tok-1',
        p_device_fingerprint: 'fp-1',
        p_profile: {
          first_name: 'Jane',
          desired_title: 'Full Stack Engineer'
        }
      });
      expect(res.ok).toBe(true);
    });
  });

  describe('syncPushApplication', () => {
    it('pushes application to cloud', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{ ok: true }],
          error: null,
        }),
      };

      const res = await syncPushApplication(mockSupabase, 'user-1', 'tok-1', 'fp-1', {
        company: 'Vercel',
        title: 'Platform Engineer',
        apply_url: 'https://vercel.com/apply'
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('sync_push_application', {
        p_user_id: 'user-1',
        p_session_token: 'tok-1',
        p_device_fingerprint: 'fp-1',
        p_company: 'Vercel',
        p_title: 'Platform Engineer',
        p_apply_url: 'https://vercel.com/apply',
        p_status: 'applied',
        p_mode: 'autonomous'
      });
      expect(res.ok).toBe(true);
    });
  });

  describe('syncPushSavedJob & syncRemoveSavedJob', () => {
    it('pushes and removes saved job on cloud', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{ ok: true }],
          error: null,
        }),
      };

      const pushRes = await syncPushSavedJob(mockSupabase, 'user-1', 'tok-1', 'fp-1', {
        title: 'Backend Dev',
        company: 'Supabase',
        apply_url: 'https://supabase.com/jobs/1'
      });
      expect(pushRes.ok).toBe(true);

      const remRes = await syncRemoveSavedJob(mockSupabase, 'user-1', 'tok-1', 'fp-1', 'https://supabase.com/jobs/1');
      expect(remRes.ok).toBe(true);
    });
  });

  describe('syncPushResume & syncDeleteResume', () => {
    it('pushes and deletes resume on cloud', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{ ok: true }],
          error: null,
        }),
      };

      const pushRes = await syncPushResume(mockSupabase, 'user-1', 'tok-1', 'fp-1', {
        name: 'Resume 2026',
        target_role: 'Full Stack',
        is_default: true
      });
      expect(pushRes.ok).toBe(true);

      const delRes = await syncDeleteResume(mockSupabase, 'user-1', 'tok-1', 'fp-1', 'Resume 2026');
      expect(delRes.ok).toBe(true);
    });
  });
});
