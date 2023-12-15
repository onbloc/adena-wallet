import React, { useCallback, useEffect, useState } from 'react';
import styled, { CSSProp, FlattenSimpleInterpolation } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';

import { formatHash, getDateTimeText, getStatusStyle } from '@common/utils/client-utils';
import Text from '@components/text';
import IconShare from '@assets/icon-share';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { TransactionInfo } from '@components/transaction-history/transaction-history/transaction-history';
import TokenBalance from '@components/common/token-balance/token-balance';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import ContractIcon from '@assets/contract.svg';
import AddPackageIcon from '@assets/addpkg.svg';
import { useNetwork } from '@hooks/use-network';
import CopyButton from '@components/common/copy-button/copy-button';

interface DLProps {
  color?: string;
}

export const TransactionDetail = (): JSX.Element => {
  const { convertDenom } = useTokenMetainfo();
  const { currentNetwork } = useNetwork();
  const location = useLocation();
  const [transactionItem, setTransactionItem] = useState<TransactionInfo>();
  const navigate = useNavigate();
  const closeButtonClick = (): void => navigate(-1);

  useEffect(() => {
    setTransactionItem(location.state);
    console.log(location.state);
  }, [location]);

  const getLogoImage = useCallback(() => {
    if (transactionItem?.type === 'ADD_PACKAGE') {
      return `${AddPackageIcon}`;
    }
    if (transactionItem?.type === 'CONTRACT_CALL') {
      return `${ContractIcon}`;
    }
    if (transactionItem?.type === 'MULTI_CONTRACT_CALL') {
      return `${ContractIcon}`;
    }
    return `${transactionItem?.logo}`;
  }, [transactionItem]);

  const handleLinkClick = (hash: string): void => {
    window.open(
      `${currentNetwork?.linkUrl ?? 'https://gnoscan.io'}/transactions/details?txhash=${hash}`,
      '_blank',
    );
  };

  return transactionItem ? (
    <Wrapper>
      <img
        className='status-icon'
        src={getStatusStyle(transactionItem.status).statusIcon}
        alt='status icon'
      />
      <TokenBox color={getStatusStyle(transactionItem.status).color}>
        <img className='tx-symbol' src={getLogoImage()} alt='logo image' />
        {transactionItem.type === 'TRANSFER' ? (
          <TokenBalance
            value={transactionItem.amount.value || '0'}
            denom={transactionItem.amount.denom || '0'}
            fontStyleKey='header6'
            minimumFontSize='14px'
            orientation='HORIZONTAL'
          />
        ) : (
          <Text display={'flex'} className='main-text' type='header6'>
            {transactionItem.title}
            {transactionItem.extraInfo && (
              <Text type='body2Bold' className='extra-info'>
                {transactionItem.extraInfo}
              </Text>
            )}
          </Text>
        )}
      </TokenBox>
      <DataBox>
        <DLWrap>
          <dt>Date</dt>
          <dd>{getDateTimeText(transactionItem.date)}</dd>
        </DLWrap>
        <DLWrap>
          <dt>Type</dt>
          <dd>
            {transactionItem.typeName || ''}
            {transactionItem.extraInfo && (
              <Text className='extra-info' type='body3Bold'>
                {transactionItem.extraInfo}
              </Text>
            )}
          </dd>
        </DLWrap>
        <DLWrap color={getStatusStyle(transactionItem.status).color}>
          <dt>Status</dt>
          <StatusInfo>
            <dd>{transactionItem.status === 'SUCCESS' ? 'Success' : 'Fail'}</dd>
            <dd
              className='link-icon'
              onClick={(): void | '' =>
                transactionItem.hash && handleLinkClick(transactionItem.hash ?? '')
              }
            >
              <IconShare />
            </dd>
          </StatusInfo>
        </DLWrap>
        {transactionItem.to && (
          <DLWrap>
            <dt>To</dt>
            <dd>
              {transactionItem.to}
              <CopyButton className='copy-button' copyText={transactionItem.originTo || ''} />
            </dd>
          </DLWrap>
        )}
        {transactionItem.from && (
          <DLWrap>
            <dt>From</dt>
            <dd>
              {transactionItem.from}
              <CopyButton className='copy-button' copyText={transactionItem.originFrom || ''} />
            </dd>
          </DLWrap>
        )}
        <DLWrap>
          <dt>TxID</dt>
          <dd>
            {formatHash(transactionItem.hash)}
            <CopyButton className='copy-button' copyText={transactionItem.hash} />
          </dd>
        </DLWrap>
        {transactionItem.networkFee && (
          <DLWrap>
            <dt>Network Fee</dt>
            <dd>
              <TokenBalance
                {...convertDenom(
                  transactionItem.networkFee.value,
                  transactionItem.networkFee.denom,
                )}
                minimumFontSize='12px'
                fontStyleKey='body1Reg'
                orientation='HORIZONTAL'
              />
            </dd>
          </DLWrap>
        )}
      </DataBox>
      <div className='button-wrapper'>
        <Button
          className='close-button'
          margin='auto 0px 0px'
          fullWidth
          hierarchy={ButtonHierarchy.Dark}
          onClick={closeButtonClick}
        >
          <Text type='body1Bold'>Close</Text>
        </Button>
      </div>
    </Wrapper>
  ) : (
    <></>
  );
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  padding-top: 30px;
  .status-icon {
    width: 60px;
    height: 60px;
  }
  .extra-info {
    display: inline-flex;
    align-self: center;
    margin-left: 5px;
  }
  .button-wrapper {
    position: fixed;
    width: 100%;
    padding: 24px 20px;
    bottom: 0;
    background: ${({ theme }): string => theme.color.neutral[7]};
    box-shadow: 0px -4px 4px 0px rgba(0, 0, 0, 0.4);
  }
`;

const TokenBox = styled.div<{ color: string }>`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 70px;
  background-color: ${({ theme }): string => theme.color.neutral[8]};
  border: 1px solid ${({ color }): string => color};
  border-radius: 18px;
  padding: 0px 15px;
  margin: 18px 0px 8px;
  .tx-symbol {
    width: 30px;
    height: 30px;
  }
  .main-text {
    display: block;
    max-width: 250px;
    align-items: center;
    text-overflow: ellipsis;
    overflow: hidden;
  }
`;

const DataBox = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'center')};
  width: 100%;
  border-radius: 18px;
  background-color: ${({ theme }): string => theme.color.neutral[8]};
  margin-bottom: 96px;
`;

const DLWrap = styled.dl<DLProps>`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'space-between')};
  ${({ theme }): FlattenSimpleInterpolation => theme.fonts.body1Reg};
  width: 100%;
  height: 40px;
  padding: 0px 18px;
  :not(:last-child) {
    border-bottom: 2px solid ${({ theme }): string => theme.color.neutral[7]};
  }
  dd,
  dt {
    font: inherit;
  }
  dt {
    color: ${({ theme }): string => theme.color.neutral[9]};
  }
  dd {
    display: flex;
    color: ${(props): string => (props.color ? props.color : props.theme.color.neutral[0])};
    align-items: center;
  }

  .copy-button {
    margin-left: 5px;
  }
`;

const StatusInfo = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'space-between')};
  .link-icon {
    display: flex;
    cursor: pointer;
    padding-left: 5px;

    svg {
      path {
        fill: ${({ theme }): string => theme.color.neutral[9]};
        transition: 0.2s;
      }
    }

    :hover {
      svg {
        path {
          fill: ${({ theme }): string => theme.color.neutral[0]};
        }
      }
    }
  }
`;
