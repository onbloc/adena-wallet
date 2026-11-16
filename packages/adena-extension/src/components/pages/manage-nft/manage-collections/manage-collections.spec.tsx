import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import ManageCollections, { ManageCollectionsProps } from './manage-collections';

-describe('ManageCollections Component', () => {
  it('ManageCollections render', () => {
    const args: ManageCollectionsProps = {
      collections: [],
      keyword: '',
      queryGRC721TokenUri: () => ({}) as unknown as UseQueryResult<string | null>,
      queryGRC721Balance: () => ({}) as unknown as UseQueryResult<number | null>,
      onChangeKeyword: () => {
        return;
      },
      onClickClose: () => {
        return;
      },
      onToggleActiveItem: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ManageCollections {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
