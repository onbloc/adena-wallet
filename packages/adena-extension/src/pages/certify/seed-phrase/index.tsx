import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import TitleWithDesc from '@components/title-with-desc';
import { ErrorText } from '@components/error-text';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import DefaultInput from '@components/default-input';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import { WalletError } from '@common/errors';
import { useAdenaContext } from '@hooks/use-context';
import { validateInvalidPassword } from '@common/validation';

const text = {
  title: 'Reveal Seed Phrase',
  desc: 'Your seed phrase is the only way to\nrestore your wallet. Keep it somewhere\nsafe.',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

export const SeedPhrase = () => {
  const { walletService, accountService } = useAdenaContext();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelButtonClick = () => navigate(-1);
  const [password, setPassword] = useState('');
  const [error, setError] = useState({
    error: false,
    message: 'Invalid password',
  });

  useEffect(() => {
    setError({
      error: false,
      message: 'Invalid password',
    })
  }, [password])

  const nextButtonClick = async () => {
    await accountService.clear();
    const storedPassword = await walletService.loadWalletPassword();
    try {
      if (validateInvalidPassword(password, storedPassword)) {
        const wallet = await walletService.loadWallet();
        if (wallet) {
          navigate(RoutePath.ViewSeedPhrase, {
            replace: true,
            state: wallet.mnemonic
          });
        }
      }
    } catch (error) {
      let message = 'Invalid password';
      if (error instanceof WalletError) {
        message = error.message;
      }
      setError({ error: true, message });
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
