// Remote data sources that are not tied to a single network.
export const REMOTE_RESOURCES = {
  // Curated token lists: {base}/gno-native/{networkId}.json, {base}/grc20/{networkId}.json.
  gnoTokenResourceBase: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main',
} as const;

export const HTTP_TIMEOUT_MS = 15_000;

// Fallback explorer for networks without their own `linkUrl`.
export const DEFAULT_EXPLORER_URL = 'https://gnoscan.io';
