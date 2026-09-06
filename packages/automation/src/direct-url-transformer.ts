/**
 * Direct-Apply URL Canonicalizer:
 * Automatically rewrites generic job posting URLs into their direct application form endpoints
 * prior to navigation with 0ms network overhead.
 */
export function transformToDirectApplyUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    // 1. Lever: /company/job-id -> /company/job-id/apply
    if (host.includes('jobs.lever.co')) {
      if (!pathname.endsWith('/apply') && !pathname.endsWith('/apply/')) {
        parsed.pathname = `${pathname.replace(/\/$/, '')}/apply`;
        return parsed.toString();
      }
    }

    // 2. Ashby: /company/job-id -> /company/job-id/application
    if (host.includes('jobs.ashbyhq.com')) {
      if (!pathname.endsWith('/application') && !pathname.endsWith('/application/')) {
        parsed.pathname = `${pathname.replace(/\/$/, '')}/application`;
        return parsed.toString();
      }
    }

    // 3. SmartRecruiters: /company/job-id -> /company/job-id/apply
    if (host.includes('jobs.smartrecruiters.com')) {
      if (!pathname.endsWith('/apply') && !pathname.endsWith('/apply/')) {
        parsed.pathname = `${pathname.replace(/\/$/, '')}/apply`;
        return parsed.toString();
      }
    }

    // 4. Greenhouse: boards.greenhouse.io/co/jobs/id -> append #app
    if (host.includes('greenhouse.io') || host.includes('gh_jid')) {
      if (!parsed.hash || !parsed.hash.includes('app')) {
        parsed.hash = '#app';
        return parsed.toString();
      }
    }

    // 5. Internshala detail URLs: append direct apply section anchor
    if (host.includes('internshala.com') && (pathname.includes('/internship/detail/') || pathname.includes('/job/detail/'))) {
      if (!parsed.hash) {
        parsed.hash = '#apply_now';
        return parsed.toString();
      }
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}
