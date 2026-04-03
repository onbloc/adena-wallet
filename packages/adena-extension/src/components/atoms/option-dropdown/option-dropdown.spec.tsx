import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import OptionDropdown, { OptionDropdownProps } from './option-dropdown';

describe('OptionDropdown Component', () => {
  it('OptionDropdown render', () => {
    const args: OptionDropdownProps = {
      options: [],
      buttonNode: <></>,
      hover: false
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <OptionDropdown {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
