import React from 'react';
import styled, { CSSProp } from 'styled-components';

import { Text, ErrorText } from '@components/atoms';
import { SeedBox, CancelAndConfirmButton } from '@components/molecules';
import theme from '@styles/theme';
import { useImportAccount } from '@hooks/certify/use-import-account';

const text = {
  title: 'Import Account',
  subTitle: 'Private Key',
  desc: 'Import an existing account\nwith a private key.',
};

export const ImportAccount = (): JSX.Element => {
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
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
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
