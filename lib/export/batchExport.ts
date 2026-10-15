// ─── Batch PDF Export & ZIP Packaging ─────────────────────────────────────────
import type { PDFItem, Region } from '@/types';
import { applyRegionsToPdf } from '@/lib/pdf/editor';
import { createZipArchive, downloadZipFile, type FileToZip } from '@/lib/zip/zipService';

export interface BatchExportOptions {
  pdfFiles: PDFItem[];
  regions: Region[];
  fileNaming?: 'original' | 'personalized';
  onProgress?: (pct: number, statusText: string) => void;
  onFontWarning?: (msg: string) => void;
}

/**
 * Filter regions applicable to a specific PDF item.
 * A region applies to a file if:
 * 1. fileTarget is 'all'
 * 2. fileTarget is undefined/empty (defaults to all in batch mode)
 * 3. fileTarget matches the item.id
 */
export function getRegionsForFile(regions: Region[], fileId: string): Region[] {
  return regions.filter((r) => !r.fileTarget || r.fileTarget === 'all' || r.fileTarget === fileId);
}

/**
 * Applies all applicable regions to every PDF in the batch, packages them into a
 * ZIP archive, and downloads the result.
 */
export async function exportBatchPdfs(options: BatchExportOptions): Promise<{ totalProcessed: number }> {
  const { pdfFiles, regions, fileNaming = 'original', onProgress, onFontWarning } = options;

  if (pdfFiles.length === 0) {
    throw new Error('No PDF files to export.');
  }

  const processedFiles: FileToZip[] = [];
  const totalFiles = pdfFiles.length;

  for (let i = 0; i < totalFiles; i++) {
    const item = pdfFiles[i];
    const applicableRegions = getRegionsForFile(regions, item.id);

    const baseProgress = Math.round((i / totalFiles) * 85);
    onProgress?.(
      baseProgress,
      `Processing ${i + 1} of ${totalFiles}: ${item.name} (${applicableRegions.length} edit${applicableRegions.length === 1 ? '' : 's'})…`
    );

    // Read source array buffer
    const sourceBytes = await item.file.arrayBuffer();

    // Apply regions
    const modifiedBytes = await applyRegionsToPdf(sourceBytes, {
      regions: applicableRegions,
      totalPages: item.totalPages,
      onProgress: (pct) => {
        const filePct = baseProgress + Math.round((pct / 100) * (85 / totalFiles));
        onProgress?.(Math.min(filePct, 85), `Editing ${item.name} (${pct}%)…`);
      },
      onFontWarning,
    });

    // Determine output file name
    let outName = item.name;
    if (fileNaming === 'personalized') {
      const base = item.name.replace(/\.pdf$/i, '');
      outName = `${base}_personalized.pdf`;
    }

    processedFiles.push({
      name: outName,
      data: modifiedBytes,
    });
  }

  onProgress?.(90, `Compressing ${totalFiles} PDF${totalFiles === 1 ? '' : 's'} into ZIP archive…`);

  // Build ZIP
  const zipBytes = createZipArchive(processedFiles);

  onProgress?.(98, 'Saving ZIP archive to your device…');

  // Trigger download
  const timestamp = new Date().toISOString().slice(0, 10);
  const zipFileName = `personalized_pdfs_${timestamp}.zip`;
  await downloadZipFile(zipBytes, zipFileName);

  onProgress?.(100, `Done! Saved ${totalFiles} PDFs.`);

  return { totalProcessed: totalFiles };
}
