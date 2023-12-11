import React, { useCallback, useEffect, useState } from 'react';
import styled, { CSSProp } from 'styled-components';
import Text from '@components/text';
import { QRCodeSVG } from 'qrcode.react';
import Copy from '@components/buttons/copy-button';
import theme from '@styles/theme';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { inputStyle } from '@components/default-input';
import { useCurrentAccount } from '@hooks/use-current-account';
import { formatAddress, formatNickname } from '@common/utils/client-utils';
import { useAccountName } from '@hooks/use-account-name';
import { TokenModel } from '@types';

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'stretch')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

const QRCodeBox = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')};
  background-color: ${({ theme }): string => theme.color.neutral[0]};
  padding: 10px;
  border-radius: 8px;
  margin: 40px 0px;
`;

const CopyInputBox = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'space-between')};
  ${inputStyle};
  border: 1px solid ${({ theme }): string => theme.color.neutral[6]};

  & .nickname {
    color: ${({ theme }): string => theme.color.neutral[2]};
  }

  margin-bottom: 8px;
`;

interface DepositState {
  type: 'token' | 'wallet';
  tokenMetainfo: TokenModel;
}

export const Deposit = (): JSX.Element => {
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
            <Text type='body2Reg' color={theme.color.neutral[9]}>
              {` (${displayAddr})`}
            </Text>
          </Text>
        )}

        <Copy copyStr={currentAddress || ''} />
      </CopyInputBox>
      <Text type='captionReg' color={theme.color.neutral[9]}>
        Only use this address to receive tokens on Gnoland.
      </Text>
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Dark}
        margin='auto 0px 0px'
        onClick={closeButtonClick}
      >
        <Text type='body1Bold'>Close</Text>
      </Button>
    </Wrapper>
  );
};
