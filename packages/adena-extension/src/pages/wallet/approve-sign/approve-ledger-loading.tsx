import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import IconConnectRequestPermissionLoading from '@assets/connect-request-permission-loading.svg';

const text = {
  title: 'Requesting Approval\non Hardware Wallet',
  desc: 'Please approve this transaction on your\nledger device to proceed.',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  max-width: 380px;
  min-height: 514px;
  padding: 50px 20px 24px;

  @keyframes rotate {
    from {
      -webkit-transform: rotate(0deg);
      -o-transform: rotate(0deg);
      transform: rotate(0deg);
    }
    to {
      -webkit-transform: rotate(360deg);
      -o-transform: rotate(360deg);
      transform: rotate(360deg);
    }
  }

  .icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
    animation: rotate 1.5s infinite;
  }

  div {
    text-align: center;
  }
`;

interface Props {
  createTransaction: () => Promise<boolean>;
  cancel: () => void;
}

export const ApproveLdegerLoading = ({ createTransaction, cancel }: Props) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    createTransactionData();
  }, []);

  useEffect(() => {
    if (failed) {
      createTransactionData();
    }
  }, [failed]);

  const init = () => {
    setFailed(false);
  };

  const fail = () => {
    setFailed(true);
  };

  const createTransactionData = async () => {
    init();
    const isCreated = await createTransaction();
    if (!isCreated) {
      setTimeout(fail, 1000);
    }
  };

  return (
    <Wrapper>
      <img className='icon' src={IconConnectRequestPermissionLoading} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Dark}
        className={'cancel-button'}
        margin='auto 0px 0px'
        onClick={cancel}
      >
        <Text type='body1Bold'>Cancel</Text>
      </Button>
    </Wrapper>
  );
};
