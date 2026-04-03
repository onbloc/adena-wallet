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

import AccountDetails, {
  AccountDetailsProps,
} from '.'

describe('AccountDetails Component', () => {
  it('AccountDetails render', () => {
    const args: AccountDetailsProps = {
      hasPrivateKey: true,
      hasSeedPhrase: true,
      originName: '',
      name: '',
      address: '',
      moveGnoscan: () => {
        return
      },
      moveRevealSeedPhrase: () => {
        return
      },
      moveExportPrivateKey: () => {
        return
      },
      setName: () => {
        return
      },
      reset: () => {
        return
      },
    }

    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <AccountDetails {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    )
  })
})
