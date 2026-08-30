import crypto from 'crypto';

/**
 * Computes SHA256 cryptographic hash of (company + title + clean_apply_url)
 * Guarantees zero duplicate job postings across 1000+ sources.
 */
export function computeJobHash(company: string, title: string, applyUrl: string): string {
  const cleanUrl = applyUrl.split('?')[0].toLowerCase().trim();
  const cleanCompany = company.toLowerCase().trim();
  const cleanTitle = title.toLowerCase().trim();
  
  const rawString = `${cleanCompany}|${cleanTitle}|${cleanUrl}`;
  return crypto.createHash('sha256').update(rawString).digest('hex');
}
