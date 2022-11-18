import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import TitleWithDesc from '@components/title-with-desc';
import { ErrorText } from '@components/error-text';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import DefaultInput from '@components/default-input';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import { useWallet } from '@hooks/use-wallet';
import { useCurrentAccount } from '@hooks/use-current-account';
import { toBase64 } from 'adena-wallet/src/encoding';

const text = {
  title: 'Export Private Key',
  desc: 'Do not share your private key!\nAnyone with your private key will have\nfull control of your wallet.',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

export const ExportAccount = () => {
  const navigate = useNavigate();
  const [wallet] = useWallet();
  const [currentAccount] = useCurrentAccount();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState({
    error: false,
    message: 'Invalid password',
  });

  const cancelButtonClick = () => navigate(-1);

  const nextButtonClick = async () => {
    try {
      const privateKey = await wallet?.getPrivateKey(currentAccount?.getAddress() ?? '');
      navigate(RoutePath.ViewPrivateKey, { replace: true, state: toBase64(privateKey) });
    } catch (error) {
      setError({ error: true, message: 'Invalid password' });
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && password) nextButtonClick();
  };

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <DefaultInput
        type='password'
        value={password}
        onChange={onChange}
        onKeyDown={onKeyDown}
        error={error.error}
        placeholder='Password'
        margin='24px 0px 0px'
        ref={inputRef}
      />
      {error.error && <ErrorText text={error.message} />}
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: cancelButtonClick }}
        confirmButtonProps={{
          onClick: nextButtonClick,
          text: 'Next',
          props: { disabled: password === '' },
        }}
      />
    </Wrapper>
  );
};
