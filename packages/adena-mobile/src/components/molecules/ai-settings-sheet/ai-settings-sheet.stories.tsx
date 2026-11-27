import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CHAT_SETTINGS } from '../../../stories/fixtures';
import { AiSettingsSheet } from './ai-settings-sheet';

const meta = {
  title: 'Molecules/AiSettingsSheet',
  component: AiSettingsSheet,
  args: {
    ...CHAT_SETTINGS,
    visible: true,
    onChangeProvider: fn(),
    onChangeApiKey: fn(),
    onRemoveApiKey: fn(),
    onChangeModel: fn(),
    onLoadLocal: fn(),
    onUnloadLocal: fn(),
    onRemoveLocal: fn(),
    onSave: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof AiSettingsSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OpenAi: Story = {};

export const OpenAiWithSavedKey: Story = { args: { hasApiKey: true, apiKey: 'sk-test-key' } };

export const LocalIdle: Story = { args: { provider: 'local' } };

export const LocalDownloading: Story = { args: { provider: 'local', local: { state: 'downloading', percentage: 42 } } };

export const LocalReady: Story = { args: { provider: 'local', local: { state: 'ready' } } };

export const LocalError: Story = { args: { provider: 'local', local: { state: 'error', message: 'Not enough free storage.' } } };

export const SaveFailed: Story = { args: { error: 'Could not save the API key.', saving: false } };
