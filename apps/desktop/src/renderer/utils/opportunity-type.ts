export type OpportunityType = 'job' | 'internship' | 'both';

export const OPPORTUNITY_TYPE_KEY = 'nomadic_target_opportunity_type';

export function normalizeOpportunityType(type?: string | null): OpportunityType {
  if (!type) return 'both';
  const clean = String(type).toLowerCase().trim();
  if (clean === 'job' || clean === 'jobs' || clean === 'full-time' || clean === 'fulltime') return 'job';
  if (clean === 'internship' || clean === 'internships' || clean === 'intern') return 'internship';
  return 'both';
}

export function getSavedOpportunityType(): OpportunityType {
  try {
    const saved = localStorage.getItem(OPPORTUNITY_TYPE_KEY);
    return normalizeOpportunityType(saved);
  } catch {
    return 'both';
  }
}

export function setSavedOpportunityType(type: OpportunityType): void {
  try {
    localStorage.setItem(OPPORTUNITY_TYPE_KEY, type);
  } catch {}
}

export function mapOpportunityTypeToFeedTab(type: OpportunityType): 'all' | 'jobs' | 'internships' {
  if (type === 'job') return 'jobs';
  if (type === 'internship') return 'internships';
  return 'all';
}

export function getOpportunityTypeLabel(type: OpportunityType): string {
  switch (type) {
    case 'job': return 'Full-Time Jobs';
    case 'internship': return 'Internships';
    case 'both': return 'Jobs & Internships';
  }
}
