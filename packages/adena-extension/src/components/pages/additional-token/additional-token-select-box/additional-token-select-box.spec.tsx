import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalStyle } from '@styles/global-style';
import AdditionalTokenSelectBox from './additional-token-select-box';
import { AdditionalTokenSelectBoxProps } from '@types';

describe('AdditionalTokenSelectBox Component', () => {
  it('AdditionalTokenSelectBox render', () => {
    const args: AdditionalTokenSelectBoxProps = {
      keyword: '',
      opened: false,
      selected: false,
      selectedTitle: '',
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
        <GlobalStyle />
        <ThemeProvider theme={theme}>
          <AdditionalTokenSelectBox {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
