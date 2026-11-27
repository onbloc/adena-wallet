import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { BackupPhrasePage } from './backup-phrase';

const WORDS = 'abandon ability able about above absent absorb abstract absurd abuse access accident'.split(' ');

const meta = {
  title: 'Pages/Onboarding/BackupPhrase',
  component: BackupPhrasePage,
  parameters: { layout: 'fullscreen' },
  args: { words: WORDS, masked: true, onReveal: fn(), canContinue: false, onContinue: fn(), onBack: fn() },
} satisfies Meta<typeof BackupPhrasePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Masked: Story = {};

export const Revealed: Story = { args: { masked: false, canContinue: true } };
