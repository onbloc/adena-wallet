import { useCallback, useState } from 'react';

import { SessionImportErrorReason } from '@services/wallet/wallet-session';

export interface UseSessionImportReturn {
  masterAddress: string;
  setMasterAddress: (v: string) => void;
  errorMessageOf: (reason: SessionImportErrorReason) => string;
}

const ERROR_MESSAGES: Record<SessionImportErrorReason, string> = {
  invalid_private_key: 'Invalid Private key format',
  invalid_master_address: 'Invalid address format',
  unsupported_network: 'Session import is only available on Gno networks.',
  no_sessions_found: 'No session found',
  session_not_found: 'Could not find this session on-chain.',
  session_expired: 'This session has expired.',
  session_already_imported: 'This session has already been imported.',
  session_pubkey_mismatch: 'This private key doesn\'t match the Session Account',
  network_changed: 'Network changed. Please fetch sessions again.',
  wallet_locked: 'Wallet is locked. Unlock it and try again.',
  network_error: 'Failed to query the chain.',
};

// Backing state for the session-add-screen "Import" tab. The screen owns the
// per-row private-key/preview flow itself; this hook only holds the shared
// master-address input and maps import error reasons to user-facing copy.
export const useSessionImportScreen = (): UseSessionImportReturn => {
  const [masterAddress, setMasterAddress] = useState('');

  const errorMessageOf = useCallback(
    (reason: SessionImportErrorReason): string => ERROR_MESSAGES[reason],
    [],
  );

  return { masterAddress, setMasterAddress, errorMessageOf };
};
