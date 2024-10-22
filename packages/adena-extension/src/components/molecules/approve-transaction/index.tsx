import React, { useCallback } from 'react';

import { Button, Text } from '@components/atoms';
import {
  ApproveInjectionLoading,
  ApproveLoading,
  BottomFixedButtonGroup,
} from '@components/molecules';

import IconArraowDown from '@assets/arrowS-down-gray.svg';
import IconArraowUp from '@assets/arrowS-up-gray.svg';
import DefaultFavicon from '@assets/favicon-default.svg';
import { ApproveTransactionWrapper } from './approve-transaction.styles';

export interface ApproveTransactionProps {
  loading: boolean;
  title: string;
  logo: string;
  domain: string;
  contracts: {
    type: string;
    function: string;
    value: string;
  }[];
  memo: string;
  hasMemo: boolean;
  isErrorNetworkFee?: boolean;
  networkFee: {
    amount: string;
    denom: string;
  };
  transactionData: string;
  opened: boolean;
  processing: boolean;
  done: boolean;
  changeMemo: (memo: string) => void;
  onToggleTransactionData: (opened: boolean) => void;
  onResponse: () => void;
  onTimeout: () => void;
  onClickConfirm: () => void;
  onClickCancel: () => void;
}

export const ApproveTransaction: React.FC<ApproveTransactionProps> = ({
  loading,
  title,
  logo,
  domain,
  contracts,
  memo,
  hasMemo,
  isErrorNetworkFee,
  networkFee,
  transactionData,
  opened,
  processing,
  done,
  changeMemo,
  onToggleTransactionData,
  onResponse,
  onTimeout,
  onClickConfirm,
  onClickCancel,
}) => {
  const onChangeMemo = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (hasMemo) {
        return;
      }

      const value = e.target.value;
      changeMemo(value);
    },
    [hasMemo, changeMemo],
  );

  if (loading) {
    return <ApproveLoading rightButtonText='Approve' />;
  }

  if (processing) {
    return <ApproveInjectionLoading done={done} onResponse={onResponse} onTimeout={onTimeout} />;
  }

  return (
    <ApproveTransactionWrapper isErrorNetworkFee={isErrorNetworkFee || false}>
      <Text className='main-title' type='header4'>
        {title}
      </Text>

      <div className='logo-wrapper'>
        <img src={logo || DefaultFavicon} alt='logo img' />
      </div>

      <div className='domain-wrapper'>
        <span>{domain}</span>
      </div>

      {contracts.map((contract, index) => (
        <div key={index} className='info-table'>
          <div className='row'>
            <span className='key'>Contract</span>
            <span className='value'>{contract.type}</span>
          </div>
          <div className='row'>
            <span className='key'>Function</span>
            <span className='value'>{contract.function}</span>
          </div>
        </div>
      ))}

      <div className={hasMemo ? 'memo-wrapper row' : 'memo-wrapper editable row'}>
        <span className='key'>Memo:</span>
        {hasMemo ? (
          <span className={'value'}>{memo}</span>
        ) : (
          <input
            type='text'
            className={'value'}
            value={memo}
            onChange={onChangeMemo}
            autoComplete='off'
            placeholder='(Optional)'
          />
        )}
      </div>

      <div className='fee-amount-wrapper row'>
        <span className='key'>Network Fee:</span>
        <span className='value'>{`${networkFee.amount} ${networkFee.denom}`}</span>
      </div>
      {isErrorNetworkFee && <span className='error-message'>Insufficient network fee</span>}

      <div className='transaction-data-wrapper'>
        <Button
          hierarchy='custom'
          bgColor='transparent'
          className='visible-button'
          onClick={(): void => onToggleTransactionData(!opened)}
        >
          {opened ? (
            <>
              <>Hide Transaction Data</>
              <img src={IconArraowUp} />
            </>
          ) : (
            <>
              <>View Transaction Data</>
              <img src={IconArraowDown} />
            </>
          )}
        </Button>

        {opened && (
          <div className='textarea-wrapper'>
            <textarea
              className='raw-info-textarea'
              value={transactionData}
              readOnly
              draggable={false}
            />
          </div>
        )}
      </div>

      <BottomFixedButtonGroup
        filled
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={{
          primary: true,
          disabled: isErrorNetworkFee,
          text: 'Approve',
          onClick: onClickConfirm,
        }}
      />
    </ApproveTransactionWrapper>
  );
};
