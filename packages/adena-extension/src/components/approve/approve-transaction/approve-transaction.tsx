import React from 'react';
import { ApproveTransactionWrapper } from './approve-transaction.styles';
import DefaultFavicon from './../../../assets/favicon-default.svg';
import Text from '@components/text';
import ApproveLoading from '../approve-loading/approve-loading';
import Button from '@components/buttons/button';
import IconArraowDown from '@assets/arrowS-down-gray.svg';
import IconArraowUp from '@assets/arrowS-up-gray.svg';
import BottomFixedButtonGroup from '@components/buttons/bottom-fixed-button-group';
import ApproveInjectionLoading from '../approve-injection-loading/approve-injection-loading';

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
  isErrorNetworkFee?: boolean;
  networkFee: {
    amount: string;
    denom: string;
  };
  transactionData: string;
  opened: boolean;
  processing: boolean;
  done: boolean;
  onToggleTransactionData: (opened: boolean) => void;
  onResponse: () => void;
  onTimeout: () => void;
  onClickConfirm: () => void;
  onClickCancel: () => void;
}

const ApproveTransaction: React.FC<ApproveTransactionProps> = ({
  loading,
  title,
  logo,
  domain,
  contracts,
  isErrorNetworkFee,
  networkFee,
  transactionData,
  opened,
  processing,
  done,
  onToggleTransactionData,
  onResponse,
  onTimeout,
  onClickConfirm,
  onClickCancel,
}) => {
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

      <div className='fee-amount-wrapper row'>
        <span className='key'>Network Fee:</span>
        <span className='value'>{`${networkFee.amount} ${networkFee.denom}`}</span>
      </div>
      {isErrorNetworkFee && <span className='error-message'>Insufficient network fee</span>}

      <div className='transaction-data-wrapper'>
        <Button className='visible-button' onClick={(): void => onToggleTransactionData(!opened)}>
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

export default ApproveTransaction;
