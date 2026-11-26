import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';

import { CardCreatePage, CardCreateStep } from './card-create';

const fee = {
  options: [
    { tier: 'SLOW' as const, label: 'Slow', feeLabel: '0.009595 GNOT' },
    { tier: 'AVERAGE' as const, label: 'Average', feeLabel: '0.010554 GNOT' },
    { tier: 'FAST' as const, label: 'Fast', feeLabel: '0.011514 GNOT' },
  ],
  selected: 'AVERAGE' as const,
  onSelect: fn(),
  customAdjustment: '1.5',
  onChangeCustomAdjustment: fn(),
  tooLow: false,
};

const meta = {
  title: 'Pages/CardCreate',
  component: CardCreatePage,
  parameters: { layout: 'fullscreen' },
  args: {
    step: CardCreateStep.WHERE,
    onBack: fn(),
    realms: [
      { path: 'gno.land/r/gnoswap/router', checking: false, description: 'Realm found' },
      { path: 'gno.land/r/gnoswap', checking: false, description: 'Opens 12 realms', warning: 'Can move your tokens: gno.land/r/gnoswap/gns' },
      { path: 'gno.land/r/demo/x', checking: true },
    ],
    realmInput: '',
    suggestions: ['gno.land/r/gnoswap/router'],
    canAddRealm: false,
    onChangeRealmInput: fn(),
    onAddRealm: fn(),
    onSelectSuggestion: fn(),
    onRemoveRealm: fn(),
    allowSend: false,
    onToggleSend: fn(),
    amount: '2',
    symbol: 'GNOT',
    onChangeAmount: fn(),
    periods: [
      { key: 0, label: 'In total', selected: false },
      { key: 86400, label: 'Every day', selected: true },
      { key: 604800, label: 'Every week', selected: false },
    ],
    onSelectPeriod: fn(),
    durations: [
      { key: 3600, label: '1 hour', selected: false, disabled: true },
      { key: 86400, label: '1 day', selected: true },
      { key: 604800, label: '7 days', selected: false },
    ],
    onSelectDuration: fn(),
    untilCaption: 'Ends about 2026-11-27 10:00',
    name: '',
    onChangeName: fn(),
    canContinue: true,
    preparing: false,
    onContinue: fn(),
    review: { confirming: false, onConfirm: fn(), onClose: fn() },
  },
} satisfies Meta<typeof CardCreatePage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Where: Story = {};

export const Limit: Story = { args: { step: CardCreateStep.LIMIT } };

export const Until: Story = { args: { step: CardCreateStep.UNTIL } };

export const Name: Story = { args: { step: CardCreateStep.NAME, name: 'Trading bot' } };

export const Review: Story = {
  args: {
    step: CardCreateStep.NAME,
    review: {
      review: {
        title: 'Issue card',
        rows: [
          { label: 'Name', value: 'Trading bot' },
          { label: 'Where', value: 'gno.land/r/gnoswap/router', multiline: true },
          { label: 'Worst case', value: '2 GNOT', emphasis: true },
        ],
        warnings: [{ title: 'Opens your token balances', description: 'gno.land/r/gnoswap/gns can move tokens you hold.' }],
        fee,
        confirmLabel: 'Hold to issue card',
      },
      confirming: false,
      onConfirm: fn(),
      onClose: fn(),
    },
  },
};
