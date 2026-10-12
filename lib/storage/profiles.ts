// ─── Profile Storage — localStorage ──────────────────────────────────────────
import type { Profile } from '@/types';

const KEY = 'pdf-personalizer:profiles';

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Profile[]) : [];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: Profile[]): void {
  localStorage.setItem(KEY, JSON.stringify(profiles));
}

export function addProfile(profile: Profile): Profile[] {
  const profiles = loadProfiles();
  const updated = [...profiles, profile];
  saveProfiles(updated);
  return updated;
}

export function deleteProfile(id: string): Profile[] {
  const updated = loadProfiles().filter((p) => p.id !== id);
  saveProfiles(updated);
  return updated;
}
