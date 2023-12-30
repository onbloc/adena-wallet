import React, { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import styled, { useTheme } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';

import { Text, inputStyle, Button, Copy } from '@components/atoms';
import { getTheme } from '@styles/theme';
import { RoutePath } from '@router/path';
import { useCurrentAccount } from '@hooks/use-current-account';
import { formatAddress, formatNickname } from '@common/utils/client-utils';
import { useAccountName } from '@hooks/use-account-name';
import { TokenModel } from '@types';
import mixins from '@styles/mixins';

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

interface DepositState {
  type: 'token' | 'wallet';
  tokenMetainfo: TokenModel;
}

export const Deposit = (): JSX.Element => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [displayAddr, setDisplayAddr] = useState('');
  const { currentAddress, currentAccount } = useCurrentAccount();
  const { accountNames } = useAccountName();
  const [type, setType] = useState('');
  const [tokenMetainfo, setTokenMetainfo] = useState<TokenModel>();

  useEffect(() => {
    if (currentAddress) {
      setDisplayAddr(formatAddress(currentAddress, 4));
    }
  }, [currentAddress]);

  useEffect(() => {
    const state = location.state as DepositState;
    setType(state.type);
    setTokenMetainfo(state.tokenMetainfo);
  }, [location]);

  const closeButtonClick = useCallback(() => {
    if (type === 'wallet') {
      navigate(RoutePath.Wallet);
      return;
    }
    navigate(-1);
  }, [type]);

  return (
    <Wrapper>
      <Text type='header4'>{`Deposit ${tokenMetainfo?.symbol || ''}`}</Text>
      <QRCodeBox>
        <QRCodeSVG value={currentAddress || ''} size={150} />
      </QRCodeBox>
      <CopyInputBox>
        {currentAccount && (
          <Text type='body2Reg' display='inline-flex'>
            {formatNickname(accountNames[currentAccount.id], 12)}
            <Text type='body2Reg' color={theme.neutral.a}>
              {` (${displayAddr})`}
            </Text>
          </Text>
        )}

        <Copy copyStr={currentAddress || ''} />
      </CopyInputBox>
      <Text type='captionReg' color={theme.neutral.a}>
        Only use this address to receive tokens on Gnoland.
      </Text>
      <Button fullWidth hierarchy='dark' margin='auto 0px 0px' onClick={closeButtonClick}>
        <Text type='body1Bold'>Close</Text>
      </Button>
    </Wrapper>
  );
};
