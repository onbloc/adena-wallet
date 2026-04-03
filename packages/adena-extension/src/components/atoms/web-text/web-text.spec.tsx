import {
  GlobalWebStyle,
} from '@styles/global-style'
import theme from '@styles/theme'
import {
  render,
} from '@testing-library/react'
import React from 'react'
import {
  RecoilRoot,
} from 'recoil'
import {
  ThemeProvider,
} from 'styled-components'
import {
  describe, it,
} from 'vitest'

import {
  WebText,
} from '.'

describe('WebText Component', () => {
  it('WebText render', () => {
    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebText
            type='title1'
            color='#000000'
            style={{
            }}
            textCenter
          >
            WebText
          </WebText>
        </ThemeProvider>
      </RecoilRoot>,
    )
  })
})
