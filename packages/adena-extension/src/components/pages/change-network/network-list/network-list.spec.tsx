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

import NetworkList, {
  NetworkListProps,
} from './network-list'

describe('NetworkList Component', () => {
  it('NetworkList render', () => {
    const args: NetworkListProps = {
      currentNetworkId: 'test3',
      networkMetainfos: [],
      changeNetwork: () => {
        return
      },
      moveEditPage: () => {
        return
      },
    }

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <NetworkList {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    )
  })
})
