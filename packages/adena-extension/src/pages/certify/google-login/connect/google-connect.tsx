import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import { GoogleTorusSigner, TorusSigner } from 'adena-torus-signin/src';

import { Text, Icon, Button } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';
import { RoutePath } from '@router/path';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigation';

const text = {
  title: 'Waiting for Google Login',
  desc: 'Complete your login by signing in with\na Google account in your browser.',
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  max-width: 380px;
  min-height: 514px;
  padding-top: 50px;

  .google-login-connect {
    margin-bottom: 24px;
  }

  div {
    text-align: center;
  }
`;

export const GoogleConnect = (): JSX.Element => {
  const { navigate } = useAppNavigate();
  const [web3auth, setWeb3auth] = useState<TorusSigner>();
  const [privateKey, setPrivateKey] = useState('');

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    connect();
  }, [web3auth]);

  useEffect(() => {
    disconnect();
  }, [privateKey]);

  const init = async (): Promise<void> => {
    const auth = GoogleTorusSigner.create();
    await auth.init();
    setWeb3auth(auth);
  };

  const connect = async (): Promise<void> => {
    if (!web3auth) {
      return;
    }
    try {
      const connected = await web3auth.connect();
      if (!connected) {
        throw new Error('Failed to connect web3auth.');
      }
      const privateKey = await web3auth.getPrivateKey();
      setPrivateKey(privateKey);
    } catch (e) {
      navigate(RoutePath.GoogleConnectFailed);
    }
  };

  const disconnect = async (): Promise<void> => {
    if (!web3auth) {
      return;
    }
    if (privateKey.length === 0) {
      return;
    }
    web3auth.disconnect();
    navigate(RoutePath.CreatePassword, {
      state: {
        type: 'GOOGLE',
        privateKey,
      },
    });
  };

  return (
    <Wrapper>
      <Icon name='iconConnectLoading' />
      <TitleWithDesc title={text.title} desc={text.desc} className='google-login-connect' />
      <Button fullWidth hierarchy='dark' margin='auto 0px 0px' onClick={(): void => window.close()}>
        <Text type='body1Bold'>Cancel</Text>
      </Button>
    </Wrapper>
  );
};
