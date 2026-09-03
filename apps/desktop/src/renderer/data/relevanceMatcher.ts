import { Job, MasterProfile } from '../types';

export interface RelevanceResult {
  score: number;
  matchedSkills: string[];
  isStrongMatch: boolean;
}

/**
 * Extracts normalized, unique keywords from a candidate profile.
 */
export function extractCandidateKeywords(profile: MasterProfile): {
  roleTokens: string[];
  skillTokens: string[];
} {
  const roleRaw = profile.desiredTitle || '';
  const skillsRaw = profile.techStack || '';

  const cleanTokens = (str: string) => {
    return str
      .toLowerCase()
      .split(/[,;|/\s]+/)
      .map(t => t.trim().replace(/^[^a-z0-9#+.]|[^a-z0-9#+.]趋$/g, ''))
      .filter(t => t.length >= 2 && !['and', 'the', 'for', 'with', 'in', 'of', 'to'].includes(t));
  };

  const roleTokens = Array.from(new Set(cleanTokens(roleRaw)));
  const skillTokens = Array.from(new Set(cleanTokens(skillsRaw)));

  return { roleTokens, skillTokens };
}

/**
 * Computes an intelligent 0-100% match score and identifies overlapping skills
 * between a candidate's profile and an opportunity.
 */
export function computeJobRelevance(job: Job, profile: MasterProfile): RelevanceResult {
  const { roleTokens, skillTokens } = extractCandidateKeywords(profile);

  // If user hasn't calibrated their profile yet, return default baseline
  if (roleTokens.length === 0 && skillTokens.length === 0) {
    return {
      score: job.score || 70,
      matchedSkills: [],
      isStrongMatch: false,
    };
  }

  const jobTitle = (job.title || '').toLowerCase();
  const jobDesc = (job.description || '').toLowerCase();
  const jobCompany = (job.company || '').toLowerCase();

  const GENERIC_ROLE_TOKENS = new Set([
    'engineer', 'developer', 'software', 'senior', 'junior', 'lead', 'staff',
    'principal', 'specialist', 'associate', 'intern', 'architect', 'consultant', 'manager'
  ]);

  let score = 30; // base score
  const matchedSkills: string[] = [];

  // 1. Title / Discipline Match (up to 45 points)
  let domainMatched = false;
  let genericMatched = false;

  for (const token of roleTokens) {
    if (jobTitle.includes(token)) {
      if (GENERIC_ROLE_TOKENS.has(token)) {
        genericMatched = true;
      } else {
        domainMatched = true;
      }
    }
  }

  if (domainMatched) {
    score += genericMatched ? 40 : 30;
  } else if (genericMatched) {
    score += 15;
  }

  // 2. Technical Skills Match (up to 35 points)
  for (const skill of skillTokens) {
    let skillFound = false;
    if (jobTitle.includes(skill)) {
      score += 12;
      skillFound = true;
    } else if (jobDesc.includes(skill)) {
      score += 8;
      skillFound = true;
    }

    if (skillFound) {
      // Capitalize for display chip
      const displayTag = skill.charAt(0).toUpperCase() + skill.slice(1);
      if (!matchedSkills.includes(displayTag)) {
        matchedSkills.push(displayTag);
      }
    }
  }

  // 3. Location / Remote Alignment (up to 10 points)
  if (job.workplaceType === 'remote' || jobTitle.includes('remote') || (job.location || '').toLowerCase().includes('remote')) {
    score += 10;
  }

  // Cap score between 35 and 98
  const finalScore = Math.min(98, Math.max(35, score));
  const isStrongMatch = (finalScore >= 70 && domainMatched) || matchedSkills.length >= 2;

  return {
    score: finalScore,
    matchedSkills: matchedSkills.slice(0, 5),
    isStrongMatch,
  };
}
