import React from 'react';
import { BalanceInputWrapper } from './balance-input.styles';

export interface BalanceInputProps {
  hasError: boolean;
  amount: string;
  denom: string;
  description: string;
  onChangeAmount: (value: string) => void;
  onClickMax: () => void;
}

const BalanceInput: React.FC<BalanceInputProps> = ({
  hasError,
  amount,
  denom,
  description,
  onChangeAmount,
  onClickMax
}) => {
  return (
    <BalanceInputWrapper className={hasError ? 'error' : ''}>
      <div className='input-wrapper'>
        <input
          className='amount-input'
          value={amount}
          onChange={event => onChangeAmount(event.target.value)}
          placeholder='Amount'
        />
        <span className='denom'>
          {denom}
        </span>

        <button className='max-button' onClick={onClickMax}>
          {'Max'}
        </button>
      </div>

      <span className='description'>{description}</span>
    </BalanceInputWrapper>
  );
};

export default BalanceInput;