import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { ThemeProvider } from 'styled-components';
import MemoInput, { MemoInputProps } from './memo-input';

describe('MemoInput Component', () => {
  it('MemoInput render', () => {
    const args: MemoInputProps = {
      memo: '132123123123',
      onChangeMemo: () => {
        return;
      },
    };

    render(
      <JotaiProvider>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <MemoInput {...args} />
        </ThemeProvider>
      </JotaiProvider>,
    );
  });
});
