import React from 'react';

import { NetworkFeeCustomInputWrapper } from './network-fee-custom-input.styles';

export interface NetworkFeeCustomInputProps {
  value: string;
  onChange: (value: string) => void;
}

const NetworkFeeCustomInput: React.FC<NetworkFeeCustomInputProps> = ({ value, onChange }) => {
  const onChangeCustomFee = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange(e.target.value);
  };

  return (
    <NetworkFeeCustomInputWrapper>
      <input
        className='fee-input'
        type='number'
        value={value}
        onChange={onChangeCustomFee}
        placeholder='Enter Custom Network Fee'
      />
    </NetworkFeeCustomInputWrapper>
  );
};

export default NetworkFeeCustomInput;
