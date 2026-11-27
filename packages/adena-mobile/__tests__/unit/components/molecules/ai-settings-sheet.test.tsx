import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { AiSettingsSheet, AiSettingsSheetProps } from '../../../../src/components/molecules';
import { CHAT_SETTINGS } from '../../../../src/stories/fixtures';
import { renderPage as render } from '../pages/render-page';

const props = (overrides: Partial<AiSettingsSheetProps> = {}): AiSettingsSheetProps => ({
  ...CHAT_SETTINGS,
  visible: true,
  onChangeProvider: jest.fn(),
  onChangeApiKey: jest.fn(),
  onRemoveApiKey: jest.fn(),
  onChangeModel: jest.fn(),
  onLoadLocal: jest.fn(),
  onUnloadLocal: jest.fn(),
  onRemoveLocal: jest.fn(),
  onSave: jest.fn(),
  onClose: jest.fn(),
  ...overrides,
});

describe('AiSettingsSheet', () => {
  it('edits the key and model and saves, hiding Remove without a saved key', async () => {
    const sheet = props();

    await render(<AiSettingsSheet {...sheet} />);
    await fireEvent.changeText(screen.getByLabelText('OpenAI API key'), 'sk-1');
    await fireEvent.press(screen.getByRole('radio', { name: 'GPT-4o' }));
    await fireEvent.press(screen.getByTestId('ai-settings-save'));

    expect(sheet.onChangeApiKey).toHaveBeenCalledWith('sk-1');
    expect(sheet.onChangeModel).toHaveBeenCalledWith('gpt-4o');
    expect(sheet.onSave).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('ai-settings-remove-key')).toBeNull();
  });

  it('removes a saved key', async () => {
    const sheet = props({ hasApiKey: true });

    await render(<AiSettingsSheet {...sheet} />);
    await fireEvent.press(screen.getByTestId('ai-settings-remove-key'));

    expect(sheet.onRemoveApiKey).toHaveBeenCalledTimes(1);
  });

  it('switches provider', async () => {
    const sheet = props();

    await render(<AiSettingsSheet {...sheet} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'On-device' }));

    expect(sheet.onChangeProvider).toHaveBeenCalledWith('local');
  });

  it('shows download progress and blocks loading while busy', async () => {
    await render(<AiSettingsSheet {...props({ provider: 'local', local: { state: 'downloading', percentage: 42 } })} />);

    expect(screen.getByText('Downloading 42%')).toBeTruthy();
    expect(screen.getByTestId('ai-settings-load').props.accessibilityState.disabled).toBe(true);
  });

  it('keeps non-finite progress within the progress range', async () => {
    await render(<AiSettingsSheet {...props({ provider: 'local', local: { state: 'downloading', percentage: Number.NaN } })} />);

    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
  });

  it('loads, unloads and deletes the local model', async () => {
    const idle = props({ provider: 'local' });
    const { unmount } = await render(<AiSettingsSheet {...idle} />);

    await fireEvent.press(screen.getByTestId('ai-settings-load'));
    await fireEvent.press(screen.getByTestId('ai-settings-delete'));
    expect(idle.onLoadLocal).toHaveBeenCalledTimes(1);
    expect(idle.onRemoveLocal).toHaveBeenCalledTimes(1);
    await unmount();

    const ready = props({ provider: 'local', local: { state: 'ready' } });

    await render(<AiSettingsSheet {...ready} />);
    await fireEvent.press(screen.getByTestId('ai-settings-unload'));
    expect(ready.onUnloadLocal).toHaveBeenCalledTimes(1);
  });
});
