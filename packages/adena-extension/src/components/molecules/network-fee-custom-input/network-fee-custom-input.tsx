import React, { useState } from 'react';

import {
  NetworkFeeCustomInputContainer,
  NetworkFeeCustomInputWrapper,
} from './network-fee-custom-input.styles';

export interface NetworkFeeCustomInputProps {
  value: string;
  changeValue: (value: string) => string;
}

const NetworkFeeCustomInput: React.FC<NetworkFeeCustomInputProps> = ({ value, changeValue }) => {
  const [fee, setFee] = useState(value);

  const onChangeCustomFee = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setFee(e.target.value);
  };

  const onFocusOut = (): void => {
    const changedValue = changeValue(fee);
    setFee(changedValue);
  };

  return (
    <NetworkFeeCustomInputContainer>
      <span className='description'>{'Network Fee Multiplier'}</span>

      <NetworkFeeCustomInputWrapper>
        <input
          className='fee-input'
          type='number'
          value={fee}
          onChange={onChangeCustomFee}
          onBlur={onFocusOut}
          placeholder='Enter Custom Network Fee'
        />
      </NetworkFeeCustomInputWrapper>
    </NetworkFeeCustomInputContainer>
  );
};

export default NetworkFeeCustomInput;
