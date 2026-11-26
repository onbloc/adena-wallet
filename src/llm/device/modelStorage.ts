import BlobUtil from 'react-native-blob-util';
import type { DownloadProgress } from '@react-native-ai/llama';

const root = `${BlobUtil.fs.dirs.DocumentDir}/adena-models-v1`;
const downloads = new Map<string, Promise<string>>();

function location(modelId: string) {
  const parts = modelId.split('/');
  if (parts.length < 3 || parts.some(part => !part || part === '.' || part === '..')) {
    throw new TypeError('Model ID must be owner/repo/filename.gguf without empty or relative path segments.');
  }
  const path = `${root}/${parts.map(part => `m-${encodeURIComponent(part)}`).join('/')}`;
  const repo = parts.slice(0, 2).map(encodeURIComponent).join('/');
  const file = parts.slice(2).map(encodeURIComponent).join('/');
  return {
    path,
    directory: path.slice(0, path.lastIndexOf('/')),
    url: `https://huggingface.co/${repo}/resolve/main/${file}?download=true`,
  };
}

export async function isModelDownloaded(modelId: string): Promise<boolean> {
  return BlobUtil.fs.exists(location(modelId).path);
}

async function download(modelId: string, onProgress?: (progress: DownloadProgress) => void): Promise<string> {
  const { path, directory, url } = location(modelId);
  if (await BlobUtil.fs.exists(path)) return path;
  if (!await BlobUtil.fs.exists(directory)) {
    try {
      await BlobUtil.fs.mkdir(directory);
    } catch (error) {
      // Different files in one repository may create the directory concurrently.
      if (!await BlobUtil.fs.isDir(directory)) throw error;
    }
  }
  const temporary = `${path}.download`;
  try {
    const response = await BlobUtil.config({ path: temporary, fileCache: true })
      .fetch('GET', url)
      .progress((received, total) => {
        const percentage = total > 0 ? Math.round(received / total * 100) : 0;
        onProgress?.({ percentage: Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0 });
      });
    const { status } = response.info();
    if (status < 200 || status >= 300) throw new Error(`Failed to download ${modelId}: HTTP ${status}`);
    await BlobUtil.fs.mv(temporary, path);
    return path;
  } catch (error) {
    if (await BlobUtil.fs.exists(temporary)) await BlobUtil.fs.unlink(temporary);
    throw error;
  }
}

/** Native streaming avoids buffering a GGUF file in JavaScript memory. */
export function downloadModel(modelId: string, onProgress?: (progress: DownloadProgress) => void): Promise<string> {
  const active = downloads.get(modelId);
  if (active) return active;
  const pending = download(modelId, onProgress).finally(() => { downloads.delete(modelId); });
  downloads.set(modelId, pending);
  return pending;
}

export async function removeModel(modelId: string): Promise<void> {
  await downloads.get(modelId)?.catch(() => undefined);
  const { path } = location(modelId);
  if (await BlobUtil.fs.exists(path)) await BlobUtil.fs.unlink(path);
}
