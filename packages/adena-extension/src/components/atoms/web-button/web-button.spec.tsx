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
  WebButton,
} from '.'

describe('WebButton Component', () => {
  it('WebButton render', () => {
    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebButton
            figure='primary'
            size='small'
            text='WebButton'
          />
        </ThemeProvider>
      </RecoilRoot>,
    )
  })
})
