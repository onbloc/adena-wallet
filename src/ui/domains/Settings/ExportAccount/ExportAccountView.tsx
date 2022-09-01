import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import TitleWithDesc from '@ui/common/TitleWithDesc';
import { ErrorText } from '@ui/common/ErrorText';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import DefaultInput from '@ui/common/DefaultInput';
import CancelAndConfirmButton from '@ui/common/Button/CancelAndConfirmButton';
import { Secp256k1HdWallet } from '@services/signer';
import { toBase64 } from '@cosmjs/encoding';

const text = {
  title: 'Export Private Key',
  desc: 'Do not share your private key!\nAnyone with your private key will have\nfull control of your wallet.',
};

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

export const ExportAccountView = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelButtonClick = () => navigate(-1);
  const nextButtonClick = () => {
    chrome.storage.local.get(['adenaWallet'], (result) => {
      (async () => {
        try {
          const wallet = await Secp256k1HdWallet.deserialize(result.adenaWallet, password);
          const privkey = toBase64(
            await wallet.getPrivkey((await wallet.getAccounts())[0].address),
          );
          navigate(RoutePath.ViewPrivateKey, { replace: true, state: privkey });
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
