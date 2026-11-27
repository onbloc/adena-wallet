import type { RuntimeInfo } from '../../llm/device';

const GIB = 1024 ** 3;

/** The benchmark header lines about what the model runs on; one line per fact, so a log is easy to compare. */
export function describeRuntime(info: RuntimeInfo | null, loadMs: number | undefined): string[] {
  const load = `model load time: ${loadMs === undefined ? '(unknown)' : `${(loadMs / 1000).toFixed(2)}s`}`;
  if (info === null) return ['runtime: no native context (is the model loaded?)', load];

  const gpu = info.gpu ? 'yes' : `no (${info.reasonNoGPU.trim() || 'no reason given'})`;
  const devices = info.devices.length > 0 ? info.devices.join(', ') : '(none reported)';
  return [
    `gpu: ${gpu}`,
    `devices: ${devices}${info.androidLib ? `, native library ${info.androidLib}` : ''}`,
    `system: ${info.systemInfo.trim().replace(/\s+/g, ' ') || '(none reported)'}`,
    `model file: ${info.model.description}, ${(info.model.parameters / 1e9).toFixed(2)}B parameters, ${(info.model.sizeBytes / GIB).toFixed(2)} GiB`,
    load,
  ];
}
