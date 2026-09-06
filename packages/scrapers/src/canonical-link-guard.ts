/**
 * Strict Canonical Link Guard
 * Validates that a job URL points to a specific individual job posting
 * and rejects all directory roots, search portals, and homepages.
 */

export interface CanonicalGuardResult {
  isValid: boolean;
  platform: 'greenhouse' | 'lever' | 'ashby' | 'internshala' | 'smartrecruiters' | 'workday' | 'remotive' | 'generic';
  cleanUrl: string;
  rejectionReason?: string;
}

export function validateCanonicalJobUrl(rawUrl: string): CanonicalGuardResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, platform: 'generic', cleanUrl: '', rejectionReason: 'empty_url' };
  }

  const trimmed = rawUrl.trim();

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    // Reject localhost, local IPs, or invalid protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { isValid: false, platform: 'generic', cleanUrl: trimmed, rejectionReason: 'invalid_protocol' };
    }

    // ── 0. REJECT KNOWN DIRECTORY ROOTS & SEARCH PARAMETERS ─────────────────
    if (
      pathname === '/' ||
      pathname === '' ||
      pathname === '/jobs' ||
      pathname === '/jobs/' ||
      pathname === '/careers' ||
      pathname === '/careers/' ||
      pathname === '/search' ||
      pathname === '/search/' ||
      pathname === '/internships' ||
      pathname === '/internships/' ||
      parsed.search.includes('size=') ||
      parsed.search.includes('keyword=') ||
      parsed.search.includes('query=')
    ) {
      // Check if it's a known direct ATS that needs a sub-path
      if (host.includes('elastic.co') || host.includes('greenhouse.io') || host.includes('lever.co') || host.includes('ashbyhq.com') || host.includes('internshala.com')) {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length < 2 && !pathname.includes('/detail/') && !pathname.includes('/jobs/')) {
          return { isValid: false, platform: 'generic', cleanUrl: trimmed, rejectionReason: 'directory_root_rejected' };
        }
      }
    }

    // ── 1. LEVER ───────────────────────────────────────────────────────────
    if (host.includes('jobs.lever.co')) {
      const segments = pathname.split('/').filter(Boolean);
      // Valid Lever format: /<company>/<uuid-or-id>
      if (segments.length >= 2) {
        const company = segments[0];
        const jobId = segments[1];
        const clean = `https://jobs.lever.co/${company}/${jobId}`;
        return { isValid: true, platform: 'lever', cleanUrl: clean };
      }
      return { isValid: false, platform: 'lever', cleanUrl: trimmed, rejectionReason: 'lever_missing_job_id' };
    }

    // ── 2. GREENHOUSE ───────────────────────────────────────────────────────
    if (host.includes('greenhouse.io')) {
      // Valid Greenhouse format: /<company>/jobs/<job_id>
      if (pathname.includes('/jobs/') && pathname.split('/jobs/')[1]?.length > 0) {
        return { isValid: true, platform: 'greenhouse', cleanUrl: trimmed.split('#')[0] };
      }
      return { isValid: false, platform: 'greenhouse', cleanUrl: trimmed, rejectionReason: 'greenhouse_missing_job_id' };
    }

    // ── 3. ASHBY ────────────────────────────────────────────────────────────
    if (host.includes('jobs.ashbyhq.com')) {
      const segments = pathname.split('/').filter(Boolean);
      // Valid Ashby format: /<company>/<job_id_or_uuid>
      if (segments.length >= 2) {
        const company = segments[0];
        const jobId = segments[1];
        const clean = `https://jobs.ashbyhq.com/${company}/${jobId}`;
        return { isValid: true, platform: 'ashby', cleanUrl: clean };
      }
      return { isValid: false, platform: 'ashby', cleanUrl: trimmed, rejectionReason: 'ashby_missing_job_id' };
    }

    // ── 4. INTERNSHALA ──────────────────────────────────────────────────────
    if (host.includes('internshala.com')) {
      // Valid Internshala format: /internship/detail/<slug> or /job/detail/<slug>
      if (pathname.startsWith('/internship/detail/') || pathname.startsWith('/job/detail/')) {
        const slug = pathname.split('/detail/')[1];
        if (slug && slug.length > 2) {
          return { isValid: true, platform: 'internshala', cleanUrl: `https://internshala.com${pathname}` };
        }
      }
      return { isValid: false, platform: 'internshala', cleanUrl: trimmed, rejectionReason: 'internshala_missing_detail_slug' };
    }

    // ── 5. SMARTRECRUITERS ─────────────────────────────────────────────────
    if (host.includes('jobs.smartrecruiters.com') || host.includes('smartrecruiters.com')) {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length >= 2) {
        return { isValid: true, platform: 'smartrecruiters', cleanUrl: trimmed };
      }
      return { isValid: false, platform: 'smartrecruiters', cleanUrl: trimmed, rejectionReason: 'smartrecruiters_missing_job_id' };
    }

    // ── 6. REMOTIVE ────────────────────────────────────────────────────────
    if (host.includes('remotive.com')) {
      if (pathname.includes('/remote-jobs/') && pathname.split('/remote-jobs/')[1]?.length > 2) {
        return { isValid: true, platform: 'remotive', cleanUrl: trimmed };
      }
      return { isValid: false, platform: 'remotive', cleanUrl: trimmed, rejectionReason: 'remotive_missing_slug' };
    }

    // ── 7. GENERIC / WORKDAY / DIRECT CAREER SITES ─────────────────────────
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length >= 1) {
      return { isValid: true, platform: 'generic', cleanUrl: trimmed };
    }

    return { isValid: false, platform: 'generic', cleanUrl: trimmed, rejectionReason: 'generic_root_page' };
  } catch (err: any) {
    return { isValid: false, platform: 'generic', cleanUrl: trimmed, rejectionReason: 'malformed_url' };
  }
}
