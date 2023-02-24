import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import React from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import theme from '@styles/theme';
import SeedBox from '@components/seed-box';
import { useImportAccount } from './use-import-account';
import { ErrorText } from '@components/error-text';

const text = {
  title: 'Import Account',
  subTitle: 'Private Key',
  desc: 'Import an existing account\nwith a private key.',
};

export const ImportAccount = () => {
  const { privateKeyState, buttonState } = useImportAccount();

  return (
    <Wrapper>
      <Text className='main-title' type='header4'>
        {text.title}
      </Text>
      <Text type='body1Bold' className='sub-title'>
        {text.subTitle}
      </Text>
      <Text type='body1Reg' color={theme.color.neutral[2]}>
        {text.desc}
      </Text>
      <SeedBox
        value={privateKeyState.value}
        onChange={privateKeyState.onChange}
        onKeyDown={privateKeyState.onKeyDown}
        error={privateKeyState.error}
        scroll={true}
      />
      {privateKeyState.error && <ErrorText text={privateKeyState.errorMessage} />}
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: buttonState.cancel }}
        confirmButtonProps={{
          onClick: buttonState.import,
          text: 'Import',
          props: { disabled: buttonState.disabled },
        }}
      />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 54px;
  .main-title {
    margin-bottom: 17px;
  }
  .sub-title {
    margin-bottom: 8px;
  }
`;
