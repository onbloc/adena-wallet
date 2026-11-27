import BlobUtil from 'react-native-blob-util';
import { downloadModel, isModelDownloaded, removeModel } from '../modelStorage';

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: { DocumentDir: '/documents' },
      exists: jest.fn(), isDir: jest.fn(), mkdir: jest.fn(), mv: jest.fn(), unlink: jest.fn(),
    },
    config: jest.fn(),
  },
}));

const native = jest.mocked(BlobUtil);
const files = new Map<string, string>();
const directories = new Set<string>();
let status: number;
let failure: Error | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  files.clear();
  directories.clear();
  status = 200;
  failure = undefined;
  native.fs.exists.mockImplementation(async path => files.has(path) || directories.has(path));
  native.fs.isDir.mockImplementation(async path => directories.has(path));
  native.fs.mkdir.mockImplementation(async path => { directories.add(path); });
  native.fs.unlink.mockImplementation(async path => { files.delete(path); });
  native.fs.mv.mockImplementation(async (from, to) => {
    const contents = files.get(from);
    if (contents === undefined) throw new Error('Missing temporary model');
    files.set(to, contents);
    files.delete(from);
    return true;
  });
  native.config.mockImplementation(({ path }) => ({
    fetch: (_method: string, url: string) => {
      const destination = path as string;
      files.set(destination, url);
      const promise = failure ? Promise.reject(failure) : Promise.resolve({ info: () => ({ status }) });
      return Object.assign(promise, {
        progress(callback: (received: number, total: number) => void) {
          callback(100, 100);
          return promise;
        },
      });
    },
  }) as never);
});

describe('model storage identity', () => {
  it('loads and removes identical filenames independently across repositories', async () => {
    const first = 'owner-a/repo/model.gguf';
    const second = 'owner-b/repo/model.gguf';
    const firstPath = await downloadModel(first);
    const secondPath = await downloadModel(second);

    expect(files.get(firstPath)).toBe('https://huggingface.co/owner-a/repo/resolve/main/model.gguf?download=true');
    expect(files.get(secondPath)).toBe('https://huggingface.co/owner-b/repo/resolve/main/model.gguf?download=true');
    await removeModel(first);
    expect(await isModelDownloaded(first)).toBe(false);
    expect(await isModelDownloaded(second)).toBe(true);
    expect(files.get(secondPath)).toContain('/owner-b/repo/');
  });

  it('never reuses or deletes an unidentifiable legacy filename cache', async () => {
    const legacy = '/documents/llama-models/model.gguf';
    files.set(legacy, 'unknown repository');
    const path = await downloadModel('owner/repo/model.gguf');

    expect(files.get(path)).toBe('https://huggingface.co/owner/repo/resolve/main/model.gguf?download=true');
    await removeModel('owner/repo/model.gguf');
    expect(files.get(legacy)).toBe('unknown repository');
  });

  it('shares an unfinished download and reuses only the published complete file', async () => {
    const model = 'owner/repo/model.gguf';
    const first = downloadModel(model);
    const second = downloadModel(model);
    const [path, samePath] = await Promise.all([first, second]);
    expect(samePath).toBe(path);
    expect(native.config).toHaveBeenCalledTimes(1);
    expect(await downloadModel(model)).toBe(path);
    expect(native.config).toHaveBeenCalledTimes(1);
    expect(files.has(`${path}.download`)).toBe(false);
  });

  it('reports progress to every caller sharing a download', async () => {
    const model = 'owner/repo/model.gguf';
    const first = jest.fn();
    const second = jest.fn();
    await Promise.all([downloadModel(model, first), downloadModel(model, second)]);
    expect(first).toHaveBeenCalledWith({ percentage: 100 });
    expect(second).toHaveBeenCalledWith({ percentage: 100 });
  });

  it('removes a partial download left by a killed run', async () => {
    const model = 'owner/repo/model.gguf';
    const path = await downloadModel(model);
    files.set(`${path}.download`, 'partial');
    await removeModel(model);
    expect([...files.keys()]).toEqual([]);
  });

  it.each(['owner/repo/../model.gguf', 'owner//model.gguf', 'model.gguf'])('rejects relative or incomplete model identity %s', async model => {
    await expect(downloadModel(model)).rejects.toThrow(TypeError);
    expect(native.config).not.toHaveBeenCalled();
  });
});

describe('failed model downloads', () => {
  it.each(['http', 'network'] as const)('removes a partial %s download and permits a fresh retry', async kind => {
    status = 503;
    if (kind === 'network') failure = new Error('Connection lost');
    await expect(downloadModel('owner/repo/model.gguf')).rejects.toThrow();
    expect(await isModelDownloaded('owner/repo/model.gguf')).toBe(false);
    expect([...files.entries()]).toEqual([]);

    status = 200;
    failure = undefined;
    const path = await downloadModel('owner/repo/model.gguf');
    expect(files.get(path)).toBe('https://huggingface.co/owner/repo/resolve/main/model.gguf?download=true');
  });
});
