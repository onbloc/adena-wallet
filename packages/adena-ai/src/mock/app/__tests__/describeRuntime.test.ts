import type { RuntimeInfo } from '../../../llm/device';
import { describeRuntime } from '../describeRuntime';

const metal: RuntimeInfo = {
  gpu: true,
  reasonNoGPU: '',
  devices: ['Metal'],
  systemInfo: 'ARM : NEON = 1 | ARM_FMA = 1',
  model: { description: 'qwen35 2B Q4_K - Medium', parameters: 2_000_000_000, sizeBytes: 1_610_612_736 },
};

describe('describeRuntime', () => {
  it('says what the model runs on and how long it took to load', () => {
    expect(describeRuntime(metal, 2500)).toEqual([
      'gpu: yes',
      'devices: Metal',
      'system: ARM : NEON = 1 | ARM_FMA = 1',
      'model file: qwen35 2B Q4_K - Medium, 2.00B parameters, 1.50 GiB',
      'model load time: 2.50s',
    ]);
  });

  it('gives the reason when no GPU is used, and the Android library', () => {
    const lines = describeRuntime(
      { ...metal, gpu: false, reasonNoGPU: ' No GPU backend ', devices: [], androidLib: 'rnllama_v8', systemInfo: 'CPU :\n NEON = 1' },
      undefined
    );

    expect(lines.slice(0, 3)).toEqual(['gpu: no (No GPU backend)', 'devices: (none reported), native library rnllama_v8', 'system: CPU : NEON = 1']);
    expect(lines.at(-1)).toBe('model load time: (unknown)');
  });

  it('still reports the load time when there is no native context', () => {
    expect(describeRuntime(null, 1000)).toEqual(['runtime: no native context (is the model loaded?)', 'model load time: 1.00s']);
  });
});
