import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import AccountNameInput, { AccountNameInputProps } from '.';

describe('AccountNameInput Component', () => {
  it('AccountNameInput render', () => {
    const args: AccountNameInputProps = {
      originName: '',
      name: '',
      setName: () => {
        return;
      },
      reset: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AccountNameInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
