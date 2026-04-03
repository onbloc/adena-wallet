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

import WebAnswerButton from './web-answer-button'

describe('WebAnswerButton Component', () => {
  it('WebAnswerButton render', () => {
    render(
      <RecoilRoot>
        <GlobalWebStyle />
        <ThemeProvider theme={theme}>
          <WebAnswerButton
            correct
            selected
            answer='answer'
            onClick={(): void => { return }}
          />
        </ThemeProvider>
      </RecoilRoot>,
    )
  })
})
