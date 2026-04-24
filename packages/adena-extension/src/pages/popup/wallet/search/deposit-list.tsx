import React, { useCallback } from 'react';

import LeftArrowIcon from '@assets/arrowL-left.svg';
import IconQRCode from '@assets/icon-qrcode';
import { CHAIN_ICON_BY_GROUP } from '@assets/icons/cosmos-icons';
import { formatAddress } from '@common/utils/client-utils';
import { Button, CopyIconButton, SubHeader, Text } from '@components/atoms';
import { useAccountChainAddresses } from '@hooks/use-account-chain-addresses';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import {
  ButtonWrap,
  ChainItem,
  ChainList,
  HeaderWrap,
  IconButtonShell,
  QRIconButton,
  Wrapper,
} from './deposit-list.styles';

const CHAIN_DISPLAY_NAME: Record<string, string> = {
  gno: 'Gno.land',
  atomone: 'AtomOne',
};

export const DepositList = (): JSX.Element => {
  const { navigate } = useAppNavigate<RoutePath.WalletSearch>();
  const chainAddressEntries = useAccountChainAddresses();

  const onClickQR = useCallback(
    (networkId: string) => {
      navigate(RoutePath.Deposit, {
        state: {
          type: 'wallet',
          token: { symbol: '', networkId },
        },
      });
    },
    [navigate],
  );

  const onClickClose = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, [navigate]);

  const onClickBack = useCallback(() => {
    navigate(RoutePath.Wallet);
  }, [navigate]);

  return (
    <Wrapper>
      <HeaderWrap>
        <SubHeader
          title='Deposit'
          leftElement={{
            element: <img src={LeftArrowIcon} alt='back icon' />,
            onClick: onClickBack,
          }}
        />
      </HeaderWrap>
      <ChainList>
        {chainAddressEntries.map(({ chain, address }) => {
          const chainName = CHAIN_DISPLAY_NAME[chain.chainGroup] ?? chain.displayName;
          const chainIcon = CHAIN_ICON_BY_GROUP[chain.chainGroup] ?? chain.chainIconUrl;
          return (
            <ChainItem key={chain.id}>
              <div className='chain-left'>
                {chainIcon && (
                  <img className='chain-icon' src={chainIcon} alt={chainName} />
                )}
                <div className='chain-text'>
                  <span className='chain-name'>{chainName}</span>
                  <span className='chain-address'>{formatAddress(address, 6)}</span>
                </div>
              </div>
              <div className='chain-right'>
                <IconButtonShell>
                  <CopyIconButton copyText={address} size={14} />
                </IconButtonShell>
                <QRIconButton
                  type='button'
                  onClick={(): void => onClickQR(chain.chainId)}
                  aria-label='Show QR code'
                >
                  <IconQRCode />
                </QRIconButton>
              </div>
            </ChainItem>
          );
        })}
      </ChainList>
      <ButtonWrap>
        <Button fullWidth hierarchy='dark' onClick={onClickClose}>
          <Text type='body1Bold'>Close</Text>
        </Button>
      </ButtonWrap>
    </Wrapper>
  );
};
