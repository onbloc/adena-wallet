import atoneIcon from './atone.svg';
import photonIcon from './photon.svg';

/**
 * Maps chain profile IDs to their chain icon URLs (webpack-processed).
 * Add new entries here when registering additional Cosmos chains.
 */
export const CHAIN_ICON_MAP: Record<string, string> = {
  'atomone-1': atoneIcon,
};

/**
 * Maps token IDs to their token icon URLs (webpack-processed).
 * Cosmos token icons are sourced here because they are not managed by tokenService.
 */
export const COSMOS_TOKEN_ICON_MAP: Record<string, string> = {
  'atomone-1:uatone': atoneIcon,
  'atomone-1:uphoton': photonIcon,
};
