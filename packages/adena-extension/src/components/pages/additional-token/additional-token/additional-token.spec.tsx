import React from 'react';

import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { AdditionalTokenProps } from '@types';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import AdditionalToken from '.';
import { AddingType } from '../additional-token-type-selector';

describe('AdditionalToken Component', () => {
  it('AdditionalToken render', () => {
    const args: AdditionalTokenProps = {
      opened: false,
      addingType: AddingType.MANUAL,
      selected: true,
      keyword: '',
      manualTokenPath: '',
      selectedTokenInfo: null,
      tokenInfos: [],
      isLoadingManualGRC20Token: false,
      isErrorManualGRC20Token: false,
      selectAddingType: () => {
        return;
      },
      onChangeKeyword: () => {
        return;
      },
      onChangeManualTokenPath: () => {
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
