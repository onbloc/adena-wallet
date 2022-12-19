import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconConnectRequestPermissionLoading from '@assets/connect-request-permission-loading.svg';
import theme from '@styles/theme';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import IconConnectFailPermission from '@assets/connect-fail-permission.svg';

const text = {
  title: 'Transaction Rejected',
  desc: 'The transaction has been rejected on\nyour ledger device. Please approve the\ntransaction in your wallet to complete\nthe transaction.',
};

const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: 50px;
  justify-content: space-between;

  .button-wrapper {
    display: flex;
    flex-direction: row;
    width: 100%;
  }

  .cancel-button {
    background-color: ${theme.color.neutral[4]};
  }

  .icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
  }

  div {
    text-align: center;
  }
`;

export const SendConfirmReject = () => {

  const navigate = useNavigate();

  const onClickClose = () => {
    navigate(RoutePath.Wallet);
  }

  return (
    <Wrapper>
      <img className='icon' src={IconConnectFailPermission} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='0px 0px 0px 5px'
        onClick={onClickClose}
      >
        <Text type='body1Bold'>Close</Text>
      </Button>
    </Wrapper>
  );
};
