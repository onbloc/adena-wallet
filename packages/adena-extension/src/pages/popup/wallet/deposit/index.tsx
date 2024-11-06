import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import { formatAddress, formatNickname } from '@common/utils/client-utils';
import { Button, Copy, inputStyle, Text } from '@components/atoms';
import { useAccountName } from '@hooks/use-account-name';
import useAppNavigate from '@hooks/use-app-navigate';
import { useCurrentAccount } from '@hooks/use-current-account';
import useSessionParams from '@hooks/use-session-state';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import { RoutePath } from '@types';

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

export const Deposit = (): JSX.Element => {
  const theme = useTheme();
  const { navigate, goBack } = useAppNavigate<RoutePath.Deposit>();
  const { params } = useSessionParams<RoutePath.Deposit>();
  const [displayAddr, setDisplayAddr] = useState('');
  const { currentAddress, currentAccount } = useCurrentAccount();
  const { accountNames } = useAccountName();

  useEffect(() => {
    if (currentAddress) {
      setDisplayAddr(formatAddress(currentAddress, 4));
    }
  }, [currentAddress]);

  const closeButtonClick = useCallback(() => {
    if (params?.type === 'wallet') {
      navigate(RoutePath.Wallet);
      return;
    }
    goBack();
  }, [params?.type]);

  return (
    <Wrapper>
      <Text type='header4'>{`Deposit ${params?.tokenMetainfo?.symbol || ''}`}</Text>
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
        Only use this address to receive tokens on gno.land.
      </Text>
      <Button fullWidth hierarchy='dark' margin='auto 0px 0px' onClick={closeButtonClick}>
        <Text type='body1Bold'>Close</Text>
      </Button>
    </Wrapper>
  );
};
