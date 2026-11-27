import { act } from 'react';
import { createRoot, type Root } from 'test-renderer';

import type { RuntimeStatus } from '../../../llm/device';
import { ModelHeader, ModelSettings, modelControlsBlocked } from '../PlaygroundModel';

jest.mock('react-native', () => ({
  Pressable: 'Pressable', Text: 'Text', TextInput: 'TextInput', View: 'View',
  StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('../../../llm/device', () => ({ DEFAULT_MODEL_ID: 'test-model' }));
jest.mock('../../../llm/remote', () => ({ DEFAULT_REMOTE_MODEL: 'hosted-model' }));

const ready: RuntimeStatus = { state: 'ready', modelId: 'test-model', loadMs: 1 };
const idleActivity = { preparing: false, running: false, benchmarking: false };
const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
const previousEnvironment = environment.IS_REACT_ACT_ENVIRONMENT;

beforeAll(() => { environment.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { environment.IS_REACT_ACT_ENVIRONMENT = previousEnvironment; });

describe('model lifecycle controls', () => {
  let root: Root;
  const unload = jest.fn(async () => {});
  const remove = jest.fn(async () => {});
  const load = jest.fn(async () => {});
  const onSourceChange = jest.fn();
  const onApiKeyChange = jest.fn();

  beforeEach(() => { root = createRoot(); jest.clearAllMocks(); });
  afterEach(async () => { await act(async () => { root.unmount(); }); });

  it.each([
    ['chat', ready, { ...idleActivity, running: true }],
    ['benchmark', ready, { ...idleActivity, benchmarking: true }],
    ['preparation', ready, { ...idleActivity, preparing: true }],
    ['download', { state: 'downloading', modelId: 'test-model', percentage: 25 }, idleActivity],
    ['load', { state: 'loading', modelId: 'test-model' }, idleActivity],
    ['unload', { state: 'unloading', modelId: 'test-model' }, idleActivity],
  ] satisfies [string, RuntimeStatus, typeof idleActivity][])(
    'blocks destructive operations and provider changes during %s', async (_name, status, activity) => {
      const blocked = modelControlsBlocked(status, activity);
      await act(async () => {
        root.render(<ModelSettings status={status} source="device" apiKey="" keyError={null}
          blocked={blocked} onSourceChange={onSourceChange} onApiKeyChange={onApiKeyChange}
          unload={unload} remove={remove} />);
      });
      const buttons = root.container.queryAll((node) => node.type === 'Pressable');
      expect(buttons).toHaveLength(4);
      for (const button of buttons) {
        expect(button.props.disabled).toBe(true);
        await act(async () => { button.props.onPress(); });
      }
      expect(unload).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      expect(onSourceChange).not.toHaveBeenCalled();
    }
  );

  it('allows provider changes and destructive operations again after activity finishes', async () => {
    await act(async () => {
      root.render(<ModelSettings status={ready} source="device" apiKey="" keyError={null}
        blocked={modelControlsBlocked(ready, idleActivity)} onSourceChange={onSourceChange}
        onApiKeyChange={onApiKeyChange} unload={unload} remove={remove} />);
    });
    const buttons = root.container.queryAll((node) => node.type === 'Pressable');
    for (const button of buttons) {
      expect(button.props.disabled).toBe(false);
      await act(async () => { button.props.onPress(); });
    }
    expect(onSourceChange.mock.calls).toEqual([['device'], ['openai']]);
    expect(unload).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['preparation', { ...idleActivity, preparing: true }],
    ['chat', { ...idleActivity, running: true }],
    ['benchmark', { ...idleActivity, benchmarking: true }],
  ])('does not replace a hosted provider key during %s', async (_name, activity) => {
    await act(async () => {
      root.render(<ModelSettings status={{ state: 'idle' }} source="openai" apiKey="original" keyError={null}
        blocked={modelControlsBlocked({ state: 'idle' }, activity)}
        onSourceChange={onSourceChange} onApiKeyChange={onApiKeyChange} unload={unload} remove={remove} />);
    });
    const [input] = root.container.queryAll((node) => node.type === 'TextInput');
    expect(input.props.editable).toBe(false);
    await act(async () => { input.props.onChangeText('replacement'); });
    expect(onApiKeyChange).not.toHaveBeenCalled();
  });

  it('blocks loading while a chat or benchmark owns the runtime', async () => {
    for (const activity of [{ ...idleActivity, running: true }, { ...idleActivity, benchmarking: true }]) {
      await act(async () => {
        root.render(<ModelHeader status={{ state: 'idle' }} remoteMode={false} remoteReady={false}
          blocked={modelControlsBlocked({ state: 'idle' }, activity)} load={load} />);
      });
      const [button] = root.container.queryAll((node) => node.type === 'Pressable');
      expect(button.props.disabled).toBe(true);
      await act(async () => { button.props.onPress(); });
    }
    expect(load).not.toHaveBeenCalled();
  });
});
