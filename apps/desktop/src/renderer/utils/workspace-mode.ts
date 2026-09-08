import { PersonaTrack, TabType } from '../types';

export type WorkspaceMode = 'learner_only' | 'seeker_only' | 'unified';

export const WORKSPACE_MODE_KEY = 'nomadic_workspace_mode';

export function normalizeWorkspaceMode(mode?: string | null): WorkspaceMode {
  if (!mode) return 'unified';
  const clean = String(mode).toLowerCase().trim();
  if (clean === 'learner_only' || clean === 'learner') return 'learner_only';
  if (clean === 'seeker_only' || clean === 'seeker') return 'seeker_only';
  return 'unified';
}

export function getSavedWorkspaceMode(): WorkspaceMode {
  try {
    const saved = localStorage.getItem(WORKSPACE_MODE_KEY);
    return normalizeWorkspaceMode(saved);
  } catch {
    return 'unified';
  }
}

export function setSavedWorkspaceMode(mode: WorkspaceMode): void {
  try {
    localStorage.setItem(WORKSPACE_MODE_KEY, mode);
  } catch {}
}

export function getAvailableTracks(mode: WorkspaceMode): PersonaTrack[] {
  if (mode === 'learner_only') return ['learner'];
  if (mode === 'seeker_only') return ['seeker'];
  return ['learner', 'seeker'];
}

export function getDefaultTabForMode(mode: WorkspaceMode): TabType {
  if (mode === 'seeker_only') return 'feed';
  return 'learner-roadmaps';
}
