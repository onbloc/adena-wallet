import React from 'react';
import styled, { CSSProp } from 'styled-components';

import { Text, Icon, Button, ButtonHierarchy } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';

const text = {
  title: 'Loading Accounts',
  desc: 'We’re loading accounts from your\nledger device. This will take a few\nseconds...',
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding: 24px 20px;
  margin: 0 auto;

  .icon {
    margin: 20px auto;
  }

  div {
    text-align: center;
  }
`;

export const ConnectRequestWalletLoad = (): JSX.Element => {
  return (
    <Wrapper>
      <Icon name='iconConnectLoading' className='icon' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} margin='auto 0px 0px' disabled>
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};
