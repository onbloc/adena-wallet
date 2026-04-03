import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { AdditionalTokenProps } from '@types';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { describe, it } from 'vitest';

import { AddingType } from '../additional-token-type-selector';
import AdditionalToken from '.';

describe('AdditionalToken Component', () => {
  it('AdditionalToken render', () => {
    const args: AdditionalTokenProps = {
      opened: false,
      addingType: AddingType.MANUAL,
      selected: true,
      keyword: '',
      manualTokenPath: '',
      selectedTokenPath: null,
      selectedTokenInfo: null,
      tokenInfos: [],
      isLoadingManualGRC20Token: false,
      isLoadingSelectedGRC20Token: false,
      errorManualGRC20Token: null,
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
      }
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AdditionalToken {...args} />
        </ThemeProvider>
      </RecoilRoot>
    );
  });
});
