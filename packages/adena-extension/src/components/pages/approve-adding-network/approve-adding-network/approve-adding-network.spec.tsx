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

import ApproveAddingNetwork, {
  ApproveAddingNetworkProps,
} from './approve-adding-network'

describe('ApproveAddingNetwork Component', () => {
  it('ApproveAddingNetwork render', () => {
    const args: ApproveAddingNetworkProps = {
      networkInfo: {
        name: '',
        rpcUrl: '',
        chainId: '',
      },
      logo: '',
      approvable: true,
      processing: false,
      done: false,
      approve: () => {
        return
      },
      cancel: () => {
        return
      },
      onResponse: () => {
        return
      },
      onTimeout: () => {
        return
      },
    }

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveAddingNetwork {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    )
  })
})
