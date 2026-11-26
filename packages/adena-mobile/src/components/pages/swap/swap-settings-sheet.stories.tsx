import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { SwapSettingsSheet } from './swap-settings-sheet';

const meta = {
  title: 'Pages/Swap/SettingsSheet',
  component: SwapSettingsSheet,
  args: {
    visible: true,
    autoSlippage: true,
    autoSlippageLabel: '0.5%',
    slippageValueLabel: '0.50%',
    deadlineValueLabel: '10 minutes',
    slippageText: '',
    deadlineText: '10',
    slippageValid: true,
    deadlineValid: true,
    canSave: false,
    onSelectAuto: fn(),
    onSelectCustom: fn(),
    onChangeSlippage: fn(),
    onChangeDeadline: fn(),
    onSave: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof SwapSettingsSheet>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Auto: Story = {};

export const CustomChanged: Story = {
  args: { autoSlippage: false, slippageText: '1', slippageValueLabel: '1.00%', deadlineText: '30', deadlineValueLabel: '30 minutes', canSave: true },
};

export const HighSlippage: Story = {
  args: { autoSlippage: false, slippageText: '10', slippageValueLabel: '10.00%', slippageWarning: 'High slippage: your swap may be front-run and fill at a worse price.', canSave: true },
};
