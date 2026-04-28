import React, { useState } from 'react';

import { TransferModeTabsWrapper } from './transfer-mode-tabs.styles';

export type TransferMode = 'send' | 'ibc';

export interface TransferModeTabsProps {
  value: TransferMode;
  onChange: (mode: TransferMode) => void;
}

interface TabDefinition {
  value: TransferMode;
  label: string;
  disabled?: boolean;
  disabledTooltip?: string;
}

const TABS: TabDefinition[] = [
  { value: 'send', label: 'Send' },
  { value: 'ibc', label: 'IBC Transfer', disabled: true, disabledTooltip: 'Coming soon!' },
];

const TransferModeTabs: React.FC<TransferModeTabsProps> = ({ value, onChange }) => {
  const [hoveredTab, setHoveredTab] = useState<TransferMode | null>(null);

  return (
    <TransferModeTabsWrapper>
      {TABS.map((tab) => {
        const isActive = value === tab.value;
        const isDisabled = !!tab.disabled;
        const showTooltip = isDisabled && hoveredTab === tab.value && !!tab.disabledTooltip;
        return (
          <div
            key={tab.value}
            className={[
              'tab',
              isActive ? 'active' : '',
              isDisabled ? 'disabled' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role='button'
            aria-disabled={isDisabled}
            onClick={(): void => {
              if (isDisabled) return;
              onChange(tab.value);
            }}
            onMouseEnter={(): void => setHoveredTab(tab.value)}
            onMouseLeave={(): void => setHoveredTab(null)}
          >
            {tab.label}
            {showTooltip && <span className='tab-tooltip'>{tab.disabledTooltip}</span>}
          </div>
        );
      })}
    </TransferModeTabsWrapper>
  );
};

export default TransferModeTabs;
