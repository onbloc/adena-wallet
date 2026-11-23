export const APP_CONFIG = {
  deepLinkScheme: 'adena',
  // Auto-lock after this much time idle or in the background.
  autoLockMs: 5 * 60 * 1000,
  mnemonicStrength: 256,
  dappRequestMaxBytes: 64 * 1024,
} as const;
