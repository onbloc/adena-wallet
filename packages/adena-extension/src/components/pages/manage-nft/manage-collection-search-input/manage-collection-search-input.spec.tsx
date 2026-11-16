import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import ManageCollectionSearchInput, {
  ManageCollectionSearchInputProps,
} from './manage-collection-search-input';

describe('ManageCollectionSearchInput Component', () => {
  it('ManageCollectionSearchInput render', () => {
    const args: ManageCollectionSearchInputProps = {
      keyword: 'as',
      onChangeKeyword: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ManageCollectionSearchInput {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
