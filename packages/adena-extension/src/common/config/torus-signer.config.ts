import type { TorusSignerConfig } from 'adena-torus-signin'

export const torusSignerConfig: TorusSignerConfig = {
  web3AuthClientId: process.env.WEB3_AUTH_CLIENT_ID || '',
  web3AuthNetwork: process.env.WEB3_AUTH_NETWORK || '',
  chainId: process.env.CHAIN_ID || '',
  rpcTarget: process.env.RPC_TARGET || '',
  displayName: process.env.DISPLAY_NAME || '',
  tickerName: process.env.TICKER_NAME || '',
  ticker: process.env.TICKER || '',
  logo: process.env.LOGO || '',
  blockExplorerUrl: process.env.BLOCK_EXPLORER_URL || '',
}
