import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import AdditionalTokenSearchList, {
  AdditionalTokenSearchListProps,
} from './additional-token-search-list';

describe('AdditionalTokenSearchList Component', () => {
  it('AdditionalTokenSearchList render', () => {
    const args: AdditionalTokenSearchListProps = {
      tokenInfos: [],
      onClickListItem: () => {
        return;
      },
    };

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AdditionalTokenSearchList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
