import RNFS from 'react-native-fs';

import {
  MODELS_DIR,
  getModelPath,
  type ModelCatalogEntry,
} from '@shared/utils/llm';

export interface DownloadProgress {
  percent: number;
  bytesWritten: number;
  totalBytes: number;
}

interface DownloadJob {
  jobId: number;
  tmpPath: string;
  finalPath: string;
}

const activeJobs = new Map<string, DownloadJob>();

export const ensureModelsDir = async (): Promise<void> => {
  const exists = await RNFS.exists(MODELS_DIR);

  if (!exists) {
    await RNFS.mkdir(MODELS_DIR);
    console.log('[ModelDownloader] Created models dir:', MODELS_DIR);
  }
};

export const cancelModelDownload = async (fileName: string): Promise<void> => {
  const job = activeJobs.get(fileName);

  if (job) {
    console.log(`[ModelDownloader] Cancelling download: ${fileName}`);
    RNFS.stopDownload(job.jobId);
  }
};

export const downloadModel = async (
  entry: ModelCatalogEntry,
  onProgress: (progress: DownloadProgress) => void,
): Promise<void> => {
  await ensureModelsDir();

  const finalPath = getModelPath(entry.fileName);
  const tmpPath = `${finalPath}.tmp`;

  if (await RNFS.exists(finalPath)) {
    console.log(`[ModelDownloader] Already downloaded: ${entry.fileName}`);
    return;
  }

  // Clean up leftovers from a previously interrupted run.
  if (await RNFS.exists(tmpPath)) {
    await RNFS.unlink(tmpPath);
  }

  let lastReportedPercent = -1;

  const job: DownloadJob = { jobId: -1, tmpPath, finalPath };
  activeJobs.set(entry.fileName, job);

  try {
    const downloadResult = RNFS.downloadFile({
      fromUrl: entry.downloadUrl,
      toFile: tmpPath,
      background: true,
      discretionary: false,
      progressInterval: 200,
      progressDivider: 1,
      begin: res => {
        console.log(
          `[ModelDownloader] Started ${entry.displayName} ` +
            `(${res.contentLength} bytes)`,
        );
        onProgress({ percent: 0, bytesWritten: 0, totalBytes: res.contentLength });
      },
      progress: res => {
        const totalBytes = res.contentLength || 1;
        const percent = Math.min(
          99,
          Math.floor((res.bytesWritten / totalBytes) * 100),
        );

        if (percent !== lastReportedPercent) {
          lastReportedPercent = percent;
          onProgress({
            percent,
            bytesWritten: res.bytesWritten,
            totalBytes,
          });
        }
      },
    });

    job.jobId = downloadResult.jobId;

    await downloadResult.promise;

    // Rename to the sanitized final name only after full success, so an
    // interrupted download can never leave a corrupt "complete" model.
    if (!(await RNFS.exists(tmpPath))) {
      throw new Error('Download finished but temp file is missing.');
    }

    await RNFS.moveFile(tmpPath, finalPath);

    console.log(`[ModelDownloader] Saved to: ${finalPath}`);

    onProgress({ percent: 100, bytesWritten: 0, totalBytes: 0 });
  } catch (error) {
    try {
      if (await RNFS.exists(tmpPath)) {
        await RNFS.unlink(tmpPath);
      }
    } catch (cleanupError) {
      console.warn('[ModelDownloader] Temp cleanup failed:', cleanupError);
    }

    console.error(`[ModelDownloader] Failed for ${entry.fileName}:`, error);
    throw error;
  } finally {
    activeJobs.delete(entry.fileName);
  }
};
