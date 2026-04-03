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
  SubHeader, SubHeaderProps,
} from '.';

describe('SubHeader Component', () => {
  it('SubHeader render', () => {
    const args: SubHeaderProps = {
      title: '',
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <SubHeader {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
