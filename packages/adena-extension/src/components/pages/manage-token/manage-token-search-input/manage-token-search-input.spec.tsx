import {
  describe, it,
} from 'vitest';
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

import ManageTokenSearchInput, {
  ManageTokenSearchInputProps,
} from './manage-token-search-input';

describe('ManageTokenSearchInput Component', () => {
  it('ManageTokenSearchInput render', () => {
    const args: ManageTokenSearchInputProps = {
      keyword: 'as',
      onChangeKeyword: () => {
        return;
      },
      onClickAdded: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ManageTokenSearchInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
