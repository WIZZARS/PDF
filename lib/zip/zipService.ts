// ─── ZIP Archive Utility using fflate ─────────────────────────────────────────
import { zipSync, type Zippable } from 'fflate';

export interface FileToZip {
  name: string;
  data: Uint8Array;
}

/**
 * Synchronously packs an array of binary files into a ZIP archive Uint8Array.
 * Handles filename collisions automatically.
 */
export function createZipArchive(files: FileToZip[]): Uint8Array {
  const zippable: Zippable = {};
  const nameCounts: Record<string, number> = {};

  for (const file of files) {
    let finalName = file.name;
    // ensure unique filename in the zip archive
    if (nameCounts[finalName]) {
      const dotIndex = finalName.lastIndexOf('.');
      const base = dotIndex !== -1 ? finalName.slice(0, dotIndex) : finalName;
      const ext = dotIndex !== -1 ? finalName.slice(dotIndex) : '';
      const count = nameCounts[finalName];
      nameCounts[finalName] = count + 1;
      finalName = `${base} (${count})${ext}`;
    } else {
      nameCounts[finalName] = 1;
    }
    zippable[finalName] = file.data;
  }

  return zipSync(zippable, { level: 6 });
}

/**
 * Prompts user or initiates direct browser download of the ZIP archive.
 */
export async function downloadZipFile(
  zipBytes: Uint8Array,
  zipName = 'personalized_documents.zip'
): Promise<void> {
  const blob = new Blob([zipBytes as unknown as BlobPart], { type: 'application/zip' });

  // 1. Desktop native File System Access API if supported
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      // @ts-expect-error - File System Access API
      const handle = await window.showSaveFilePicker({
        suggestedName: zipName,
        types: [
          {
            description: 'ZIP Archive',
            accept: { 'application/zip': ['.zip'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (pickerErr: unknown) {
      if (pickerErr instanceof Error && pickerErr.name === 'AbortError') {
        return; // user cancelled picker
      }
      // fallback to regular anchor download
    }
  }

  // 2. Direct browser anchor download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 4000);
}
