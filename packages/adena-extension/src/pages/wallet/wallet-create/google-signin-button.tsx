import React from 'react';
import { CSSProperties } from 'styled-components';

import googleLogo from '@assets/google-logo.svg';
import { Text, Button } from '@components/atoms';

interface GoogleSignInButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => unknown;
  margin?: CSSProperties['margin'];
}

const GoogleSignInButton = ({ onClick, margin }: GoogleSignInButtonProps): JSX.Element => {
  return (
    <Button fullWidth hierarchy='normal' onClick={onClick} margin={margin}>
      <img src={googleLogo} alt='google logo' />
      <Text type='body1Bold' margin='0px 0px 0px 8px'>
        Sign in With Google
      </Text>
    </Button>
  );
};

export default GoogleSignInButton;
