import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
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

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'stretch')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

const QRCodeBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  background-color: ${({ theme }) => theme.color.neutral[0]};
  padding: 10px;
  border-radius: 8px;
  margin: 40px 0px;
`;

const CopyInputBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  ${inputStyle};
  border: 1px solid ${({ theme }) => theme.color.neutral[6]};

  & .nickname {
    color: ${({ theme }) => theme.color.neutral[2]};
  }

  margin-bottom: 8px;
`;

export const Deposit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [displayaddr, setDisplayaddr] = useState('');
  const [currentAccount] = useCurrentAccount();
  useEffect(() => {
    setDisplayaddr(
      currentAccount?.data.address.slice(0, 4) + '...' + currentAccount?.data.address.slice(-4),
    );
  }, [currentAccount?.data.address, displayaddr]);

  const closeButtonClick = () =>
    location.state === 'token' ? navigate(RoutePath.TokenDetails) : navigate(RoutePath.Wallet);

  return (
    <Wrapper>
      <Text type='header4'>Deposit GNOT</Text>
      <QRCodeBox>
        <QRCodeSVG value={currentAccount?.data.address || ''} size={150} />
      </QRCodeBox>
      <CopyInputBox>
        {currentAccount && (
          <Text type='body2Reg' display='inline-flex'>
            {formatNickname(currentAccount.data.name, 12)}
            <Text type='body2Reg' color={theme.color.neutral[9]}>
              {` (${formatAddress(currentAccount?.data.address)})`}
            </Text>
          </Text>
        )}

        <Copy copyStr={currentAccount?.data.address || ''} />
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
