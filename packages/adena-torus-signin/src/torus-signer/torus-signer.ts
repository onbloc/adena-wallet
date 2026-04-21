import { GoogleTorusSigner } from './google-torus-signer'
import { MockTorusSigner } from './mock-torus-signer'

export interface TorusSigner {
  init: () => Promise<boolean>

  connect: () => Promise<boolean>

  disconnect: () => Promise<boolean>

  getPrivateKey: () => Promise<string>
}
export interface TorusSignerConfig {
  web3AuthClientId: string
  web3AuthNetwork: string
  chainId: string
  rpcTarget: string
  displayName: string
  tickerName: string
  ticker: string
  logo: string
  blockExplorerUrl: string
}

function isValidConfig(config: TorusSignerConfig): boolean {
  return (
    config.web3AuthClientId !== '' &&
    config.web3AuthNetwork !== '' &&
    config.chainId !== '' &&
    config.rpcTarget !== ''
  )
}

export function createTorusSigner(config: TorusSignerConfig): TorusSigner {
  if (!isValidConfig(config)) {
    return MockTorusSigner.create()
  }

  return GoogleTorusSigner.create(config)
}
