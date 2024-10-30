import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ManageCollectionsButton {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
