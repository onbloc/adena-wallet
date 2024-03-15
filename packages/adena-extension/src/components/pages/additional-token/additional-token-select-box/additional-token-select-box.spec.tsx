import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import AdditionalTokenSelectBox from './additional-token-select-box';
import { AdditionalTokenSelectBoxProps } from '@types';

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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AdditionalTokenSelectBox {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
