import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { ProtectWalletPage } from './protect-wallet';

const meta = {
  title: 'Pages/Onboarding/ProtectWallet',
  component: ProtectWalletPage,
  parameters: { layout: 'fullscreen' },
  args: { eyebrow: 'Setup / 1 of 2', biometryLabel: 'Face ID', onEnable: fn(), onSkip: fn(), onBack: fn() },
} satisfies Meta<typeof ProtectWalletPage>;

export default meta;

export const Default: StoryObj<typeof meta> = {};
