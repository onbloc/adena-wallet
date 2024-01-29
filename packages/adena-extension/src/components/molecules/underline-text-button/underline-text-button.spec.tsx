import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import { UnderlineTextButton, UnderlineTextButtonProps } from '.';

describe('UnderlineTextButton Component', () => {
  it('UnderlineTextButton render', () => {
    const args: UnderlineTextButtonProps = {
      text: '',
      onClick: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <UnderlineTextButton {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
