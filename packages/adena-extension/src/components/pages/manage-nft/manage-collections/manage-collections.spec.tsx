import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { UseQueryResult } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ManageCollections {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
