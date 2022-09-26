import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Typography from '@ui/common/Typography';
import { QRCodeSVG } from 'qrcode.react';
import Copy from '@ui/common/Copy';
import theme from '@styles/theme';
import FullButton from '@ui/common/Button/FullButton';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { inputStyle } from '@ui/common/DefaultInput';
import { useSdk } from '@services/client';

const model = {
  walletName: 'Account 1',
  nickname: 'gno1...e558',
};

const Wrapper = styled.section`
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
  border: 1px solid ${({ theme }) => theme.color.neutral[4]};

  & .nickname {
    color: ${({ theme }) => theme.color.neutral[2]};
  }

  margin-bottom: 8px;
`;

export const DepositView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [displayaddr, setDisplayaddr] = useState('');
  const { address, addrname } = useSdk();
  useEffect(() => {
    setDisplayaddr(address.slice(0, 4) + '...' + address.slice(-4));
  }, [address, displayaddr]);

  const closeButtonClick = () =>
    location.state === 'token' ? navigate(RoutePath.TokenDetails) : navigate(RoutePath.Wallet);

  return (
    <Wrapper>
      <Typography type='header4'>Deposit GNOT</Typography>
      <QRCodeBox>
        <QRCodeSVG value={address} size={150} />
      </QRCodeBox>
      <CopyInputBox>
        <strong>
          {addrname[0].length > 11 ? `${addrname[0].slice(0, 11)}..` : (addrname[0] as string)}
          &nbsp;
          <span className='nickname'>&#40;{displayaddr}&#41;</span>
        </strong>
        <Copy seeds={address} />
      </CopyInputBox>
      <Typography type='captionReg' color={theme.color.neutral[3]}>
        Only use this address to receive tokens on Gnoland.
      </Typography>
      <FullButton mode='dark' margin='auto 0px 0px' onClick={closeButtonClick}>
        <Typography type='body1Bold'>Close</Typography>
      </FullButton>
    </Wrapper>
  );
};
