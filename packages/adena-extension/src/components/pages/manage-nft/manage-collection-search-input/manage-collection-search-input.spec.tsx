import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ManageCollectionSearchInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
