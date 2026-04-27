import React, { useCallback } from 'react';

import { NetworkState } from '@states';
import { TestnetModeToggleWrapper } from './testnet-mode-toggle.styles';

type NetworkMode = NetworkState.NetworkMode;

export interface TestnetModeToggleProps {
  mode: NetworkMode;
  onChange: (mode: NetworkMode) => void;
}

const TestnetModeToggle: React.FC<TestnetModeToggleProps> = ({ mode, onChange }) => {
  const checked = mode === 'testnet';

  const onToggle = useCallback(() => {
    onChange(checked ? 'mainnet' : 'testnet');
  }, [checked, onChange]);

  return (
    <TestnetModeToggleWrapper>
      <div className='label-wrapper'>
        <span className='label'>Testnet Mode</span>
        <span className='description'>Enable to show testnet networks</span>
      </div>
      <label className='switch'>
        <input type='checkbox' checked={checked} onChange={onToggle} />
        <span className='slider' />
      </label>
    </TestnetModeToggleWrapper>
  );
};

export default TestnetModeToggle;
