import { createClient } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: 'trial' | 'pro' | 'max' | 'enterprise' | 'lifetime';
  role?: 'admin' | 'user';
  status?: 'active' | 'suspended';
  license_key?: string;
  expires_at?: string;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  current_ip: string;
  device_fingerprint: string;
  device_name?: string;
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

export interface CloudUserData {
  profile: Record<string, unknown> | null;
  applications: Array<Record<string, unknown>>;
  savedJobs: Array<Record<string, unknown>>;
  resumes: Array<Record<string, unknown>>;
}

export function getSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    realtime: {
      transport: typeof WebSocket !== 'undefined' ? WebSocket : undefined,
    },
  });
}

/**
 * Register or Lock Device Session on Login.
 * Strictly enforces 1 active device/laptop per account.
 */
export async function registerDeviceSession(
  supabase: any,
  userId: string,
  sessionToken: string,
  deviceFingerprint: string,
  deviceName: string,
  clientIp: string,
  forceTakeover: boolean = false
): Promise<{ ok: boolean; conflict: boolean; activeDevice?: string; reason?: string }> {
  try {
    const { data, error } = await supabase.rpc('register_device_session', {
      p_user_id: userId,
      p_session_token: sessionToken,
      p_device_fingerprint: deviceFingerprint,
      p_device_name: deviceName,
      p_client_ip: clientIp,
      p_force_takeover: forceTakeover
    });

    if (error) {
      console.error('Register Device Session Error:', error.message);
      return { ok: false, conflict: false, reason: error.message };
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      ok: Boolean(row?.ok),
      conflict: Boolean(row?.conflict),
      activeDevice: row?.active_device ? String(row.active_device) : undefined,
      reason: row?.reason ? String(row.reason) : undefined
    };
  } catch (err: any) {
    console.error('Register Device Session Exception:', err);
    return { ok: false, conflict: false, reason: String(err?.message ?? err) };
  }
}

/**
 * Single-Laptop Heartbeat Verification
 * Returns false if session was invalidated due to another device taking over.
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

    const rows = Array.isArray(data) ? data : data ? [data] : [];
    const resData = rows[0] as { is_valid?: boolean; reason?: string } | undefined;
    return {
      valid: Boolean(resData?.is_valid),
      reason: resData?.reason ? String(resData.reason) : undefined
    };
  } catch (err: any) {
    console.error('Session Heartbeat Exception:', err);
    return { valid: false, reason: String(err?.message ?? err) };
  }
}

/**
 * Pull all cloud data for the user on fresh login or laptop switch.
 */
export async function syncPullUserData(
  supabase: any,
  userId: string,
  sessionToken: string,
  deviceFingerprint: string
): Promise<{ ok: boolean; error?: string; data?: CloudUserData }> {
  try {
    const { data, error } = await supabase.rpc('sync_pull_user_data', {
      p_user_id: userId,
      p_session_token: sessionToken,
      p_device_fingerprint: deviceFingerprint
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || !row.ok) {
      return { ok: false, error: row?.error || 'Failed to pull cloud user data' };
    }

    return {
      ok: true,
      data: {
        profile: row.profile || null,
        applications: Array.isArray(row.applications) ? row.applications : [],
        savedJobs: Array.isArray(row.saved_jobs) ? row.saved_jobs : [],
        resumes: Array.isArray(row.resumes) ? row.resumes : []
      }
    };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

/**
 * Push candidate master profile to Supabase cloud.
 */
export async function syncPushUserProfile(
  supabase: any,
  userId: string,
  sessionToken: string,
  deviceFingerprint: string,
  profile: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('sync_push_user_profile', {
      p_user_id: userId,
      p_session_token: sessionToken,
      p_device_fingerprint: deviceFingerprint,
      p_profile: profile
    });

    if (error) return { ok: false, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.ok), error: row?.error };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

/**
 * Push an application record to Supabase cloud.
 */
export async function syncPushApplication(
  supabase: any,
  userId: string,
  sessionToken: string,
  deviceFingerprint: string,
  app: { company: string; title: string; apply_url: string; status?: string; mode?: string }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('sync_push_application', {
      p_user_id: userId,
      p_session_token: sessionToken,
      p_device_fingerprint: deviceFingerprint,
      p_company: app.company,
      p_title: app.title,
      p_apply_url: app.apply_url,
      p_status: app.status || 'applied',
      p_mode: app.mode || 'autonomous'
    });

    if (error) return { ok: false, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.ok), error: row?.error };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

/**
 * Push a saved job to Supabase cloud.
 */
export async function syncPushSavedJob(
  supabase: any,
  userId: string,
  sessionToken: string,
  deviceFingerprint: string,
  job: {
    title: string;
    company: string;
    apply_url: string;
    location?: string;
    salary?: string;
    source?: string;
    score?: number;
    description?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('sync_push_saved_job', {
      p_user_id: userId,
      p_session_token: sessionToken,
      p_device_fingerprint: deviceFingerprint,
      p_title: job.title,
      p_company: job.company,
      p_apply_url: job.apply_url,
      p_location: job.location || null,
      p_salary: job.salary || null,
      p_source: job.source || null,
      p_score: job.score || 100,
      p_description: job.description || null
    });

    if (error) return { ok: false, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.ok), error: row?.error };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

/**
 * Remove a saved job from Supabase cloud.
 */
export async function syncRemoveSavedJob(
  supabase: any,
  userId: string,
  sessionToken: string,
  deviceFingerprint: string,
  applyUrl: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('sync_remove_saved_job', {
      p_user_id: userId,
      p_session_token: sessionToken,
      p_device_fingerprint: deviceFingerprint,
      p_apply_url: applyUrl
    });

    if (error) return { ok: false, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.ok), error: row?.error };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

/**
 * Push a resume record to Supabase cloud.
 */
export async function syncPushResume(
  supabase: any,
  userId: string,
  sessionToken: string,
  deviceFingerprint: string,
  resume: {
    name: string;
    target_role?: string;
    file_path?: string;
    resume_text?: string;
    is_default?: boolean;
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('sync_push_resume', {
      p_user_id: userId,
      p_session_token: sessionToken,
      p_device_fingerprint: deviceFingerprint,
      p_name: resume.name,
      p_target_role: resume.target_role || null,
      p_file_path: resume.file_path || null,
      p_resume_text: resume.resume_text || null,
      p_is_default: Boolean(resume.is_default)
    });

    if (error) return { ok: false, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.ok), error: row?.error };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

/**
 * Delete a resume record from Supabase cloud.
 */
export async function syncDeleteResume(
  supabase: any,
  userId: string,
  sessionToken: string,
  deviceFingerprint: string,
  resumeName: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('sync_delete_resume', {
      p_user_id: userId,
      p_session_token: sessionToken,
      p_device_fingerprint: deviceFingerprint,
      p_name: resumeName
    });

    if (error) return { ok: false, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.ok), error: row?.error };
  } catch (err: any) {
    return { ok: false, error: String(err?.message ?? err) };
  }
}

export async function handleRazorpaySuccessRpc(
  supabase: any,
  params: {
    userId?: string;
    email: string;
    plan: string;
    amount: string;
    paymentId: string;
    orderId?: string;
  }
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase.rpc('handle_razorpay_payment_success', {
      p_user_id: params.userId || null,
      p_email: params.email,
      p_plan: params.plan,
      p_amount: params.amount,
      p_payment_id: params.paymentId,
      p_order_id: params.orderId || null,
    });
    if (error) return { ok: false, reason: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return { ok: Boolean(row?.ok), reason: row?.reason };
  } catch (err: any) {
    return { ok: false, reason: String(err?.message ?? err) };
  }
}
