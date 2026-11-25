import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { SAMPLE_ADDRESS, SWAP_MESSAGES } from '../../../stories/fixtures';
import { InjectSheetPage } from './inject-sheet';

const meta = {
  title: 'Pages/InjectSheet (Android overlay)',
  component: InjectSheetPage,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Confirm transaction',
    dappName: 'Gnoswap',
    origin: 'https://gnoswap.io',
    rows: [
      { label: 'Account', value: '123123123' },
      { label: 'Address', value: SAMPLE_ADDRESS, multiline: true },
      { label: 'Network', value: 'Gno.land Onyx' },
    ],
    messages: SWAP_MESSAGES,
    fee: '0.134336 GNOT',
    loading: false,
    auth: { mode: 'biometric', biometricLabel: 'Fingerprint', password: '', onChangePassword: fn() },
    approveLabel: 'Approve',
    approving: false,
    canApprove: true,
    onApprove: fn(),
    onReject: fn(),
  },
} satisfies Meta<typeof InjectSheetPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Biometric: Story = {};

export const Password: Story = { args: { auth: { mode: 'password', password: '', onChangePassword: fn() }, canApprove: false } };

export const Loading: Story = { args: { loading: true, canApprove: false, fee: undefined } };

export const InvalidLink: Story = { args: { unavailable: { title: 'Invalid request', description: 'payload is not valid base64url JSON' } } };

export const NoWallet: Story = {
  args: { unavailable: { title: 'Set up Adena first', description: 'Create or import a wallet in Adena, then try again from the app.' } },
};
