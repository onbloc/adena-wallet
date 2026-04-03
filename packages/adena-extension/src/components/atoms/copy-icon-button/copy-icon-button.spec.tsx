import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import { CopyIconButton, CopyIconButtonProps } from '.';

describe('CopyButton Component', () => {
  it('CopyButton render', () => {
    const args: CopyIconButtonProps = { copyText: 'hello' };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <CopyIconButton {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
