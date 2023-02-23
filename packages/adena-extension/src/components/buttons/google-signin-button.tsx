import React from 'react';
import googleLogo from '@assets/google-logo.svg';
import Text from '@components/text';
import Button from './button';
import theme from '@styles/theme';
import { CSSProperties } from 'styled-components';

interface GoogleSigninButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => unknown;
  margin?: CSSProperties['margin'];
}

const GoogleSigninButton = ({ onClick, margin }: GoogleSigninButtonProps) => {
  return (
    <Button fullWidth bgColor={theme.color.neutral[6]} onClick={onClick} margin={margin}>
      <img src={googleLogo} alt='google logo' />
      <Text type='body1Bold' margin='0px 0px 0px 8px'>
        Sign in With Google
      </Text>
    </Button>
  );
};

export default GoogleSigninButton;