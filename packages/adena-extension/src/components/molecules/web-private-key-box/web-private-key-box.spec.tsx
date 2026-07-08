import { stringToBase64 } from '@common/utils/encoding-util';
import { GlobalWebStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { WebPrivateKeyBox } from '.';

describe('WebPrivateKeyBox Component', () => {
  const renderWithTheme = (node: React.ReactElement): ReturnType<typeof render> =>
    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>{node}</ThemeProvider>
      </RecoilRoot>,
    );

  it('WebPrivateKeyBox render', () => {
    renderWithTheme(<WebPrivateKeyBox privateKey={stringToBase64('privateKey')} showBlur />);
  });

  it('displays decoded private key when revealed', () => {
    const privateKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const { getByDisplayValue } = renderWithTheme(
      <WebPrivateKeyBox privateKey={stringToBase64(privateKey)} showBlur={false} />,
    );

    expect(getByDisplayValue(privateKey)).toBeTruthy();
  });
});
