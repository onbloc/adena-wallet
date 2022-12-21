import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconSuccessSymbol from '@assets/success-symbol.svg';

const text = {
  title: 'Account Added',
  desc: 'You have successfully added your\nledger device account to Adena!',
};

const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: 50px;

  .icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
  }

  div {
    text-align: center;
  }
`;

export const ApproveConnectHardwareWalletFinish = () => {

  const onClickDoneButton = () => {
    window.close();
  };

  return (
    <Wrapper>
      <img className='icon' src={IconSuccessSymbol} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
        onClick={onClickDoneButton}
      >
        <Text type='body1Bold'>Done</Text>
      </Button>
    </Wrapper>
  );
};
