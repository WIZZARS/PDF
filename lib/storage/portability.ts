// ─── Data Portability — JSON backup import/export ────────────────────────────
import type { BackupFile, Profile, Template } from '@/types';
import { loadProfiles, saveProfiles } from './profiles';
import { loadTemplates, saveTemplate } from './templates';

/** Serialize all profiles and templates to a downloadable JSON file. */
export async function exportBackup(): Promise<void> {
  const profiles = loadProfiles();
  const templates = await loadTemplates();

  const backup: BackupFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles,
    templates,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'pdf-personalizer-backup.json';
  a.click();
  // Delay revoke so Safari has time to initiate the download
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Parse a backup JSON file and merge its contents into storage. */
export async function importBackup(file: File): Promise<void> {
  const text = await file.text();
  const backup = JSON.parse(text) as BackupFile;

  if (backup.version !== 1) {
    throw new Error(`Unsupported backup version: ${backup.version}`);
  }

  // Merge profiles — skip duplicates by id
  const existing = new Set(loadProfiles().map((p) => p.id));
  const newProfiles: Profile[] = [
    ...loadProfiles(),
    ...backup.profiles.filter((p) => !existing.has(p.id)),
  ];
  saveProfiles(newProfiles);

  // Merge templates — skip duplicates by id
  const existingTemplates = await loadTemplates();
  const existingIds = new Set(existingTemplates.map((t) => t.id));
  for (const t of backup.templates) {
    if (!existingIds.has(t.id)) await saveTemplate(t);
  }
}
