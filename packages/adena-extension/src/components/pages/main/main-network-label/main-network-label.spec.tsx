import {
  GlobalPopupStyle,
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

import MainNetworkLabel, {
  MainNetworkLabelProps,
} from './main-network-label'

describe('MainNetworkLabel Component', () => {
  it('MainNetworkLabel render', () => {
    const args: MainNetworkLabelProps = {
      networkName: 'Network',
    }

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <MainNetworkLabel {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    )
  })
})
