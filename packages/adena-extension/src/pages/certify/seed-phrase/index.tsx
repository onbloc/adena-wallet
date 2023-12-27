import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

import { ErrorText, DefaultInput } from '@components/atoms';
import { TitleWithDesc, CancelAndConfirmButton } from '@components/molecules';
import { RoutePath } from '@router/path';
import { WalletError } from '@common/errors';
import { useAdenaContext } from '@hooks/use-context';
import { validateInvalidPassword } from '@common/validation';
import mixins from '@styles/mixins';

const text = {
  title: 'Reveal Seed Phrase',
  desc: 'Your seed phrase is the only way to\nrestore your wallet. Keep it somewhere\nsafe.',
};

const Wrapper = styled.main`
  ${mixins.flex('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

export const SeedPhrase = (): JSX.Element => {
  const { walletService, accountService } = useAdenaContext();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelButtonClick = (): void => navigate(-1);
  const [password, setPassword] = useState('');
  const [error, setError] = useState({
    error: false,
    message: 'Invalid password',
  });

  useEffect(() => {
    setError({
      error: false,
      message: 'Invalid password',
    });
  }, [password]);

  const nextButtonClick = async (): Promise<void> => {
    await accountService.clear();
    const storedPassword = await walletService.loadWalletPassword();
    try {
      if (validateInvalidPassword(password, storedPassword)) {
        const wallet = await walletService.loadWallet();
        if (wallet) {
          navigate(RoutePath.ViewSeedPhrase, {
            replace: true,
            state: wallet.mnemonic,
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

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => setPassword(e.target.value);
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
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
