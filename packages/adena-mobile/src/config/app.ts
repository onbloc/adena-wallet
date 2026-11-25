export const APP_CONFIG = {
  deepLinkScheme: 'adena',
  // Auto-lock after this much time idle or in the background.
  autoLockMs: 5 * 60 * 1000,
  mnemonicStrength: 256,
  dappRequestMaxBytes: 64 * 1024,
  // How long an answered dApp request is remembered; a transaction request cannot outlive it.
  dappRequestTtlMs: 24 * 60 * 60 * 1000,
} as const;
