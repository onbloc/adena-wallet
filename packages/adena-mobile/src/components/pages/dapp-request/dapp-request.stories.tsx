import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { SAMPLE_ADDRESS, SWAP_MESSAGES } from '../../../stories/fixtures';
import { DappRequestPage } from './dapp-request';

const meta = {
  title: 'Pages/DappRequest',
  component: DappRequestPage,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Confirm transaction',
    dappName: 'Gnoswap',
    origin: 'https://gnoswap.io',
    networkName: 'Onyx',
    accountName: '123123123',
    address: SAMPLE_ADDRESS,
    messages: SWAP_MESSAGES,
    fee: '0.134336 GNOT',
    memo: 'Executed through gnoswap.io',
    loading: false,
    approveLabel: 'Approve',
    approving: false,
    canApprove: true,
    onApprove: fn(),
    onReject: fn(),
  },
} satisfies Meta<typeof DappRequestPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MultiMessageSwap: Story = {};

export const Connect: Story = { args: { title: 'Connect app', approveLabel: 'Connect', messages: [], fee: undefined, memo: undefined } };

export const Simulating: Story = { args: { loading: true, canApprove: false, fee: undefined } };

export const NotConnected: Story = {
  args: { canApprove: false, fee: undefined, error: 'https://gnoswap.io is not connected to this account. Connect the app first.' },
};

export const SimulationFailed: Story = { args: { canApprove: false, error: 'signature is unauthorized' } };

export const NetworkSwitch: Story = {
  args: { networkSwitch: { visible: true, networkName: 'Onyx', onConfirm: fn(), onCancel: fn() }, canApprove: false },
};

export const Approving: Story = { args: { approving: true, canApprove: false } };
