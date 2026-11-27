import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { ImportPhrasePage } from './import-phrase';

const meta = {
  title: 'Pages/Onboarding/ImportPhrase',
  component: ImportPhrasePage,
  parameters: { layout: 'fullscreen' },
  args: { phrase: '', onChangePhrase: fn(), onPaste: fn(), onReveal: fn(), onSubmit: fn(), onBack: fn() },
} satisfies Meta<typeof ImportPhrasePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = { args: { phrase: 'abandon ability able about above absent absorb abstract absurd abuse access accident' } };

export const Invalid: Story = { args: { phrase: 'abandon abandon abandon', error: 'Check the words and their order.' } };

export const Hidden: Story = { args: { phrase: 'abandon ability able', hidden: true } };
