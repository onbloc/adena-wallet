import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { WelcomePage } from './welcome';

const meta = {
  title: 'Pages/Onboarding/Welcome',
  component: WelcomePage,
  parameters: { layout: 'fullscreen' },
  args: { onCreateWallet: fn(), onImportWallet: fn() },
} satisfies Meta<typeof WelcomePage>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
