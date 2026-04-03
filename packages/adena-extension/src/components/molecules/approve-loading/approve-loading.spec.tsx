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
  ApproveLoading, ApproveLoadingProps,
} from '.';

describe('ApproveLoading Component', () => {
  it('ApproveLoading render', () => {
    const args: ApproveLoadingProps = {
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveLoading {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
