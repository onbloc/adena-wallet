import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconConnectHardwareWallet from '@assets/connect-hardware-wallet.svg';
import { useNavigate } from 'react-router-dom';
import { LedgerConnector } from 'adena-module';
import { ProgressMenu } from '@layouts/header/progress-menu';
import { RoutePath } from '@router/path';

const text = {
  title: 'Connect a\nLedger Device',
  desc: 'Connect your ledger device to your\ncomputer and make sure it is unlocked.',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding: 24px 20px;
  margin: 0 auto;

  .icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
  }

  div {
    text-align: center;
  }
`;

export const ApproveConnectHardwareWalletInit = () => {
  const navigate = useNavigate();

  const moveNextPage = async () => {
    let success = false;
    try {
      const transport = await LedgerConnector.request();
      console.log(transport);
      if (transport !== null) {
        success = true;
      }
      await transport.close();
    } catch (e) {
      console.log(e);
    }
    navigate(RoutePath.ApproveHardwareWalletConnect, { state: { success } });
  };

  const onClickConnectButton = () => {
    moveNextPage();
  };

  return (
    <Wrapper>
      <img className='icon' src={IconConnectHardwareWallet} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
        onClick={onClickConnectButton}
      >
        <Text type='body1Bold'>Connect</Text>
      </Button>
    </Wrapper>
  );
};
