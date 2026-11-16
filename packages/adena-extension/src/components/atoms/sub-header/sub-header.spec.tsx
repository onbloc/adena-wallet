import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
