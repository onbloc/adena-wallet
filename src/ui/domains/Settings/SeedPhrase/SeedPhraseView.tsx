import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import TitleWithDesc from '@ui/common/TitleWithDesc';
import { ErrorText } from '@ui/common/ErrorText';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import DefaultInput from '@ui/common/DefaultInput';
import CancelAndConfirmButton from '@ui/common/Button/CancelAndConfirmButton';
import { Secp256k1HdWallet } from '@services/signer';

const text = {
  title: 'Reveal Seed Phrase',
  desc: 'Your seed phrase is the only way to\nrestore your wallet. Keep it somewhere\nsafe.',
};

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

export const SeedPhraseView = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelButtonClick = () => navigate(-1);
  const nextButtonClick = () => {
    chrome.storage.local.get(['adenaWallet'], (result) => {
      (async () => {
        try {
          const wallet = await Secp256k1HdWallet.deserialize(result.adenaWallet, password);

          navigate(RoutePath.ViewSeedPhrase, {
            replace: true,
            state: wallet.mnemonic,
          });
        } catch (error) {
          setError({ error: true, message: 'Invalid password' });
        }
      })();
    });
  };
  const [password, setPassword] = useState('');
  const [error, setError] = useState({
    error: false,
    message: 'Invalid password',
  });

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
