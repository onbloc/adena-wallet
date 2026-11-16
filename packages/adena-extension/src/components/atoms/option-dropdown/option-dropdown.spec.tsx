import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import OptionDropdown, { OptionDropdownProps } from './option-dropdown';

describe('OptionDropdown Component', () => {
  it('OptionDropdown render', () => {
    const args: OptionDropdownProps = {
      options: [],
      buttonNode: <></>,
      hover: false,
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <OptionDropdown {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
