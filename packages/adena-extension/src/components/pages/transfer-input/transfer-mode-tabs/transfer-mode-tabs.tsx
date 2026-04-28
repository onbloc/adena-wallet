import React from 'react';

import { TransferModeTabsWrapper } from './transfer-mode-tabs.styles';

export type TransferMode = 'send' | 'ibc';

export interface TransferModeTabsProps {
  value: TransferMode;
  onChange: (mode: TransferMode) => void;
}

const TABS: { value: TransferMode; label: string }[] = [
  { value: 'send', label: 'Send' },
  { value: 'ibc', label: 'IBC Transfer' },
];

const TransferModeTabs: React.FC<TransferModeTabsProps> = ({ value, onChange }) => {
  return (
    <TransferModeTabsWrapper>
      {TABS.map((tab) => (
        <div
          key={tab.value}
          className={`tab ${value === tab.value ? 'active' : ''}`}
          role='button'
          onClick={(): void => onChange(tab.value)}
        >
          {tab.label}
        </div>
      ))}
    </TransferModeTabsWrapper>
  );
};

export default TransferModeTabs;
