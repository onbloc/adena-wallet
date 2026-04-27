import atoneChainIcon from './chains/atomone.svg';
import gnolandChainIcon from './chains/gno-chain.svg';
import atoneTokenIcon from './tokens/atone.svg';
import photonTokenIcon from './tokens/photon.svg';

/**
 * Maps chain profile IDs to their icon URLs (webpack-processed).
 * Add new entries here when registering additional chains.
 */
export const CHAIN_ICON_MAP: Record<string, string> = {
  gnoland1: gnolandChainIcon,
  'atomone-1': atoneChainIcon,
  'atomone-testnet-1': atoneChainIcon,
};

/**
 * Maps token IDs to their token icon URLs (webpack-processed).
 * Cosmos token icons are sourced here because they are not managed by tokenService.
 */
export const COSMOS_TOKEN_ICON_MAP: Record<string, string> = {
  'atomone-1:uatone': atoneTokenIcon,
  'atomone-1:uphoton': photonTokenIcon,
  'atomone-testnet-1:uatone': atoneTokenIcon,
  'atomone-testnet-1:uphoton': photonTokenIcon,
};
