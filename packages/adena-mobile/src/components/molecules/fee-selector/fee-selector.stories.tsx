import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { FeeSelector } from './fee-selector';

const options = [
  { tier: 'SLOW' as const, label: 'Slow', feeLabel: '0.1003 GNOT' },
  { tier: 'AVERAGE' as const, label: 'Average', feeLabel: '0.1103 GNOT' },
  { tier: 'FAST' as const, label: 'Fast', feeLabel: '0.1204 GNOT' },
];

const meta = {
  title: 'Molecules/FeeSelector',
  component: FeeSelector,
  args: { options, selected: 'AVERAGE', onSelect: fn(), customAdjustment: '1', onChangeCustomAdjustment: fn(), tooLow: false },
} satisfies Meta<typeof FeeSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Average: Story = {};

export const Custom: Story = { args: { selected: 'CUSTOM', customAdjustment: '1.5' } };

export const BudgetTooLow: Story = { args: { selected: 'CUSTOM', customAdjustment: '0.5', tooLow: true } };
