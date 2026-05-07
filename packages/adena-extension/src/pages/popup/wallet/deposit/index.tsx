import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import { CHAIN_ICON_BY_GROUP } from '@assets/icons/cosmos-icons';
import { formatAddress, formatNickname } from '@common/utils/client-utils';
import { Button, Copy, inputStyle, Text } from '@components/atoms';
import { useAccountChainAddresses } from '@hooks/use-account-chain-addresses';
import { useAccountName } from '@hooks/use-account-name';
import useAppNavigate from '@hooks/use-app-navigate';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import useSessionParams from '@hooks/use-session-state';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import { RoutePath } from '@types';

const CHAIN_DISPLAY_NAME: Record<string, string> = {
  gno: 'Gno.land',
  atomone: 'AtomOne',
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'stretch' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

const QRCodeBox = styled.div`
  ${mixins.flex({ direction: 'row' })};
  background-color: ${getTheme('neutral', '_1')};
  padding: 10px;
  border-radius: 8px;
  margin: 40px 0px;
`;

const CopyInputBox = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  ${inputStyle};
  border: 1px solid ${getTheme('neutral', '_7')};

  & .nickname {
    color: ${getTheme('neutral', '_3')};
  }

  margin-bottom: 8px;
`;

const ChainNoticeText = styled.p`
  ${fonts.captionReg};
  color: ${getTheme('neutral', 'a')};
  text-align: left;
  margin: 0;
  width: 100%;

  .chain-group {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    vertical-align: middle;
  }

  .chain-icon {
    width: 14px;
    height: 14px;
    border-radius: 50%;
  }

  .chain-name {
    ${fonts.captionBold};
    color: ${getTheme('neutral', '_1')};
  }
`;

export const Deposit = (): JSX.Element => {
  const theme = useTheme();
  const { navigate, goBack } = useAppNavigate<RoutePath.Deposit>();
  const { params } = useSessionParams<RoutePath.Deposit>();
  const [displayAddr, setDisplayAddr] = useState('');
  const { currentAccount } = useCurrentAccount();
  const { accountNames } = useAccountName();
  const { currentNetwork } = useNetwork();
  const chainAddressEntries = useAccountChainAddresses();

  const chainGroup = useMemo(() => {
    const lookupNetworkId = params?.token?.networkId ?? currentNetwork.networkId;
    return lookupNetworkId.startsWith('atomone') ? 'atomone' : 'gno';
  }, [params?.token?.networkId, currentNetwork.networkId]);

  const chainEntry = useMemo(
    () => chainAddressEntries.find((e) => e.chain.chainGroup === chainGroup),
    [chainAddressEntries, chainGroup],
  );

  const depositAddress = chainEntry?.address ?? '';

  const chainInfo = useMemo(
    () => ({
      icon: CHAIN_ICON_BY_GROUP[chainGroup] ?? chainEntry?.chain.chainIconUrl,
      name: CHAIN_DISPLAY_NAME[chainGroup] ?? chainEntry?.chain.displayName ?? '',
    }),
    [chainGroup, chainEntry],
  );

  useEffect(() => {
    if (depositAddress) {
      setDisplayAddr(formatAddress(depositAddress, 6));
    }
  }, [depositAddress]);

  const closeButtonClick = useCallback(() => {
    if (params?.type === 'wallet') {
      navigate(RoutePath.Wallet);
      return;
    }
    goBack();
  }, [params?.type]);

  return (
    <Wrapper>
      <Text type='header4'>{`Deposit ${params?.token.symbol || ''}`}</Text>
      <QRCodeBox>
        <QRCodeSVG value={depositAddress} size={150} />
      </QRCodeBox>
      <CopyInputBox>
        {currentAccount && (
          <Text type='body2Reg' display='inline-flex'>
            {formatNickname(accountNames[currentAccount.id] || currentAccount.name, 12)}
            <Text type='body2Reg' color={theme.neutral.a}>
              {` (${displayAddr})`}
            </Text>
          </Text>
        )}

        <Copy copyStr={depositAddress} />
      </CopyInputBox>
      <ChainNoticeText>
        Only use this address to receive tokens on the
        <br />
        <span className='chain-group'>
          {chainInfo.icon && (
            <img className='chain-icon' src={chainInfo.icon} alt={chainInfo.name} />
          )}
          <span className='chain-name'>{chainInfo.name}</span>
        </span>{' '}
        network.
      </ChainNoticeText>
      <Button fullWidth hierarchy='dark' margin='auto 0px 0px' onClick={closeButtonClick}>
        <Text type='body1Bold'>Close</Text>
      </Button>
    </Wrapper>
  );
};
