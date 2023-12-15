import React, { useRef, useState } from 'react';
import styled, { CSSProp } from 'styled-components';
import { useNavigate } from 'react-router-dom';

import TitleWithDesc from '@components/title-with-desc';
import { ErrorText } from '@components/error-text';
import { RoutePath } from '@router/path';
import DefaultInput from '@components/default-input';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';

const text = {
  title: 'Export Private Key',
  desc: 'Do not share your private key!\nAnyone with your private key will have\nfull control of your wallet.',
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
`;

export const ExportAccount = (): JSX.Element => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState({
    error: false,
    message: 'Invalid password',
  });

  const cancelButtonClick = (): void => navigate(-1);

  const nextButtonClick = async (): Promise<void> => {
    try {
      navigate(RoutePath.ViewPrivateKey, { replace: true });
    } catch (error) {
      setError({ error: true, message: 'Invalid password' });
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
