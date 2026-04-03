import {
  GlobalPopupStyle,
} from '@styles/global-style';
import theme from '@styles/theme';
import {
  render,
} from '@testing-library/react';
import React from 'react';
import {
  RecoilRoot,
} from 'recoil';
import {
  ThemeProvider,
} from 'styled-components';
import {
  describe, it,
} from 'vitest';

import {
  Spinner, SpinnerProps,
} from '.';

describe('Spinner Component', () => {
  it('Spinner render', () => {
    const args: SpinnerProps = {
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <Spinner {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
