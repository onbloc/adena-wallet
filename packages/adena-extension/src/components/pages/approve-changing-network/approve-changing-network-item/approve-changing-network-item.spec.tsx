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

import ApproveChangingNetworkItem, {
  ApproveChangingNetworkItemProps,
} from './approve-changing-network-item'

describe('ApproveChangingNetworkItem Component', () => {
  it('ApproveChangingNetworkItem render', () => {
    const args: ApproveChangingNetworkItemProps = {
      name: 'Testnet3',
    }

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveChangingNetworkItem {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    )
  })
})
