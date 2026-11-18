import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

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
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AdditionalTokenSearchList {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
