import React from 'react';
import { GlobalPopupStyle } from '@styles/global-style';
import theme from '@styles/theme';
import { render } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
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
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <MemoInput {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  });
});
