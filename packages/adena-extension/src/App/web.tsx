import {
  WebRouter,
} from '@router/web/index'
import {
  GlobalWebStyle,
} from '@styles/global-style'
import React, {
  ReactElement,
} from 'react'
import {
  MemoryRouter,
} from 'react-router'

import AppProvider from './app-provider'
import useApp from './use-app'

const RunApp = (): ReactElement<any> => {
  useApp()
  return <WebRouter />
}

const App = (): ReactElement<any> => {
  return (
    <AppProvider>
      <GlobalWebStyle />
      <MemoryRouter>
        <RunApp />
      </MemoryRouter>
    </AppProvider>
  )
}

export default App
