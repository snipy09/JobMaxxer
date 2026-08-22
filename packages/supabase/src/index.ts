import { createClient } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  current_ip: string;
  device_fingerprint: string;
  session_token: string;
  last_heartbeat: string;
}

export interface Job {
  id?: string;
  job_hash: string;
  company: string;
  title: string;
  location: string;
  description: string;
  apply_url: string;
  source: string;
  salary_range?: string;
  created_at?: string;
}

export interface UserPreference {
  user_id: string;
  target_titles: string[];
  locations: string[];
  is_remote: boolean;
  min_salary: number;
  excluded_keywords: string[];
}

export function getSupabaseClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Single-IP Heartbeat Verification
 * Returns false if session was invalidated due to another IP taking over.
 */
export async function sendSessionHeartbeat(
  supabase: any,
  userId: string,
  sessionToken: string,
  clientIp: string,
  deviceFingerprint: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase.rpc('verify_and_update_session', {
      p_user_id: userId,
      p_session_token: sessionToken,
      p_client_ip: clientIp,
      p_device_fingerprint: deviceFingerprint
    });

    if (error) {
      console.error('Session Heartbeat Error:', error.message);
      return { valid: false, reason: error.message };
    }

    const resData = data as { is_valid?: boolean; reason?: string } | null;
    return {
      valid: Boolean(resData?.is_valid),
      reason: resData?.reason ? String(resData.reason) : undefined
    };
  } catch (err: any) {
    console.error('Session Heartbeat Exception:', err);
    return { valid: false, reason: String(err?.message ?? err) };
  }
}
