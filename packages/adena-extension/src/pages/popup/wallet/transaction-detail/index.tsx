import { useMemo, useState } from 'react';
import styled from 'styled-components';

import AddPackageIcon from '@assets/addpkg.svg';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import ContractIcon from '@assets/contract.svg';
import IconShare from '@assets/icon-share';
import { SCANNER_URL } from '@common/constants/resource.constant';
import { GNOT_TOKEN } from '@common/constants/token.constant';
import { formatHash, getDateTimeText, getStatusStyle } from '@common/utils/client-utils';
import { makeQueryString } from '@common/utils/string-utils';
import { Button, CopyIconButton, Text } from '@components/atoms';
import InfoTooltip from '@components/atoms/info-tooltip/info-tooltip';
import { TokenBalance } from '@components/molecules';
import { useGetGRC721TokenUri } from '@hooks/nft/use-get-grc721-token-uri';
import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import mixins from '@styles/mixins';
import theme, { fonts, getTheme } from '@styles/theme';
import { RoutePath } from '@types';

interface DLProps {
  color?: string;
}

const storageDepositTooltipMessage = `The total amount of GNOT deposited or
released for storage usage by this
transaction.`;

export const TransactionDetail = (): JSX.Element => {
  const [hasLogoError, setHasLogoError] = useState(false);
  const [isLoadedLogo, setIsLoadedLogo] = useState(false);

  const { openLink } = useLink();
  const { convertDenom } = useTokenMetainfo();
  const { currentNetwork, scannerParameters } = useNetwork();
  const { goBack, params } = useAppNavigate<RoutePath.TransactionDetail>();

  const transactionItem = params.transactionInfo;
  const tokenUriQuery =
    transactionItem?.type === 'TRANSFER_GRC721'
      ? useGetGRC721TokenUri(transactionItem.logo, '0')
      : null;

  const logoImage = useMemo(() => {
    if (transactionItem?.type === 'TRANSFER_GRC721' && tokenUriQuery) {
      if (!isLoadedLogo || hasLogoError) {
        return `${UnknownTokenIcon}`;
      }

      return tokenUriQuery?.data || `${UnknownTokenIcon}`;
    }

    if (transactionItem?.type === 'ADD_PACKAGE') {
      return `${AddPackageIcon}`;
    }

    if (transactionItem?.type === 'CONTRACT_CALL') {
      return `${ContractIcon}`;
    }

    if (transactionItem?.type === 'MULTI_CONTRACT_CALL') {
      return `${ContractIcon}`;
    }

    if (!transactionItem?.logo) {
      return `${UnknownTokenIcon}`;
    }

    return `${transactionItem?.logo}`;
  }, [isLoadedLogo, hasLogoError, transactionItem?.type, transactionItem?.logo, tokenUriQuery]);

  const storageDeposit = useMemo(() => {
    if (!transactionItem?.storageDeposit) {
      return {
        amountValue: '0',
        amountDenom: GNOT_TOKEN.denom,
        isRefundable: false,
        fontColor: theme.neutral._1,
      };
    }

    const isRefundable = transactionItem.storageDeposit.value < 0;
    const amountValue = Math.abs(transactionItem.storageDeposit.value);
    const fontColor = isRefundable ? theme.green._5 : theme.neutral._1;

    return {
      amountValue,
      amountDenom: transactionItem.storageDeposit.denom,
      isRefundable,
      fontColor,
    };
  }, [transactionItem?.storageDeposit]);

  const handleLoadLogo = (): void => {
    setIsLoadedLogo(true);
  };

  const handleLogoError = (): void => {
    setHasLogoError(true);
  };

  const handleLinkClick = (hash: string): void => {
    const scannerUrl = currentNetwork.linkUrl || SCANNER_URL;
    const openLinkUrl = scannerParameters
      ? `${scannerUrl}/transactions/details?txhash=${hash}&${makeQueryString(scannerParameters)}`
      : `${scannerUrl}/transactions/details?txhash=${hash}`;
    openLink(openLinkUrl);
  };

  return transactionItem ? (
    <Wrapper>
      <img
        className='status-icon'
        src={getStatusStyle(transactionItem.status).statusIcon}
        alt='status icon'
      />
      <TokenBox color={getStatusStyle(transactionItem.status).color}>
        <img
          className='tx-symbol'
          src={logoImage}
          onLoad={handleLoadLogo}
          onError={handleLogoError}
          alt='logo image'
        />
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
          <dd>{transactionItem.date ? getDateTimeText(transactionItem.date) : '-'}</dd>
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
              <CopyIconButton className='copy-button' copyText={transactionItem.originTo || ''} />
            </dd>
          </DLWrap>
        )}
        {transactionItem.from && (
          <DLWrap>
            <dt>From</dt>
            <dd>
              {transactionItem.from}
              <CopyIconButton className='copy-button' copyText={transactionItem.originFrom || ''} />
            </dd>
          </DLWrap>
        )}
        <DLWrap>
          <dt>TxID</dt>
          <dd>
            {formatHash(transactionItem.hash)}
            <CopyIconButton className='copy-button' copyText={transactionItem.hash} />
          </dd>
        </DLWrap>
        <DLWrap>
          <dt>
            {'Storage Deposit'}
            <InfoTooltip content={storageDepositTooltipMessage} />
          </dt>
          <dd>
            <TokenBalance
              {...convertDenom(`${storageDeposit.amountValue}`, storageDeposit.amountDenom)}
              minimumFontSize='12px'
              fontStyleKey='body1Reg'
              orientation='HORIZONTAL'
              fontColor={storageDeposit.fontColor}
              withSign={storageDeposit.isRefundable}
            />
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
          hierarchy='dark'
          onClick={goBack}
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
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  padding-top: 30px;
  overflow: auto;

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
    background: ${getTheme('neutral', '_8')};
    box-shadow: 0px -4px 4px 0px rgba(0, 0, 0, 0.4);
  }
`;

const TokenBox = styled.div<{ color: string }>`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  flex-shrink: 0;
  width: 100%;
  height: 70px;
  background-color: ${getTheme('neutral', '_9')};
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
  ${mixins.flex()};
  width: 100%;
  border-radius: 18px;
  background-color: ${getTheme('neutral', '_9')};
  margin-bottom: 96px;
`;

const DLWrap = styled.dl<DLProps>`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  ${fonts.body1Reg};
  width: 100%;
  height: 40px;
  padding: 0px 18px;
  &:not(:last-child) {
    border-bottom: 2px solid ${getTheme('neutral', '_8')};
  }
  dd,
  dt {
    font: inherit;
  }
  dt {
    color: ${getTheme('neutral', 'a')};
    ${mixins.flex({ direction: 'row', justify: 'space-between' })};
    gap: 4px;
  }
  dd {
    display: flex;
    color: ${({ theme, color }): string => (color ? color : theme.neutral._1)};
    align-items: center;
  }

  .copy-button {
    margin-left: 5px;
  }
`;

const StatusInfo = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  .link-icon {
    display: flex;
    cursor: pointer;
    padding-left: 5px;

    svg {
      path {
        fill: ${getTheme('neutral', 'a')};
        transition: 0.2s;
      }
    }

    &:hover {
      svg {
        path {
          fill: ${getTheme('neutral', '_1')};
        }
      }
    }
  }
`;
