import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import SubHeader, { SubHeaderProps } from './sub-header';

describe('SubHeader Component', () => {
  it('SubHeader render', () => {
    const args: SubHeaderProps = {
      title: '',
    };

    render(
      <RecoilRoot>
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <SubHeader {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});