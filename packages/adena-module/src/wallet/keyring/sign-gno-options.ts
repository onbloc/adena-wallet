// SignGnoOptions extends SignRawOptions (hdPath) without importing from keyring.ts
// to avoid a circular dependency: keyring.ts -> session-keyring.ts -> sign-gno-options.ts -> keyring.ts
export interface SignGnoOptions {
  hdPath?: number;
  accountNumber?: string;
  sequence?: string;
  sessionAddr?: string;
}
