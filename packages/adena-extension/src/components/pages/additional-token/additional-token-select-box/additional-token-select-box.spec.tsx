import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { AdditionalTokenSelectBoxProps } from '@types';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import AdditionalTokenSelectBox from './additional-token-select-box';

describe('AdditionalTokenSelectBox Component', () => {
  it('AdditionalTokenSelectBox render', () => {
    const args: AdditionalTokenSelectBoxProps = {
      keyword: '',
      opened: false,
      selected: false,
      selectedInfo: null,
      tokenInfos: [],
      onChangeKeyword: () => {
        return;
      },
      onClickListItem: () => {
        return;
      },
      onClickOpenButton: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AdditionalTokenSelectBox {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
