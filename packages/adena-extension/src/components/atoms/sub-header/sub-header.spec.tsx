import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import { SubHeader, SubHeaderProps } from '.';

describe('SubHeader Component', () => {
  it('SubHeader render', () => {
    const args: SubHeaderProps = {
      title: '',
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <SubHeader {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
