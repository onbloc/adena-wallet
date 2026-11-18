import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import ManageCollectionsButton, { ManageCollectionsButtonProps } from './manage-collections-button';

describe('ManageCollectionsButton Component', () => {
  it('ManageCollectionsButton render', () => {
    const args: ManageCollectionsButtonProps = {
      onClick: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ManageCollectionsButton {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
