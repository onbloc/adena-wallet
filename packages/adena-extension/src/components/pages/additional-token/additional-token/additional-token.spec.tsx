import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import AdditionalToken from '.';
import { AdditionalTokenProps } from '@types';

describe('AdditionalToken Component', () => {
  it('AdditionalToken render', () => {
    const args: AdditionalTokenProps = {
      opened: false,
      selected: true,
      keyword: '',
      tokenInfos: [],
      onChangeKeyword: () => {
        return;
      },
      onClickOpenButton: () => {
        return;
      },
      onClickListItem: () => {
        return;
      },
      onClickBack: () => {
        return;
      },
      onClickCancel: () => {
        return;
      },
      onClickAdd: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AdditionalToken {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
