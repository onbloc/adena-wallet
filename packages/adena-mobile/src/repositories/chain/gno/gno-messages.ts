// Message type URLs follow the names the Adena extension exposes to dApps.
export const GnoMessageType = {
  BANK_MSG_SEND: '/bank.MsgSend',
  VM_CALL: '/vm.m_call',
  VM_ADDPKG: '/vm.m_addpkg',
  VM_RUN: '/vm.m_run',
  // Built by the wallet itself; never accepted from deep links.
  AUTH_CREATE_SESSION: '/auth.m_create_session',
  AUTH_REVOKE_SESSION: '/auth.m_revoke_session',
  AUTH_REVOKE_ALL_SESSIONS: '/auth.m_revoke_all_sessions',
} as const;

export type GnoMessageType = (typeof GnoMessageType)[keyof typeof GnoMessageType];

export interface GnoMemPackage {
  name: string;
  path: string;
  files: { name: string; body: string }[];
}

export interface BankSendValue {
  from_address: string;
  to_address: string;
  amount: string;
}

export interface VmCallValue {
  caller: string;
  send: string;
  max_deposit: string;
  pkg_path: string;
  func: string;
  args: string[] | null;
}

export interface VmAddPackageValue {
  creator: string;
  send: string;
  max_deposit: string;
  package: GnoMemPackage;
}

export interface VmRunValue {
  caller: string;
  send: string;
  max_deposit: string;
  package: GnoMemPackage;
}

export interface CreateSessionValue {
  creator: string;
  // Base64 33-byte compressed secp256k1 public key of the session.
  session_key: string;
  // Unix seconds; 0 means no expiry.
  expires_at: string;
  allow_paths: string[];
  // Coins string; empty means the session cannot spend.
  spend_limit: string;
  // Seconds; 0 makes spend_limit a lifetime cap.
  spend_period: string;
}

export interface RevokeSessionValue {
  creator: string;
  session_key: string;
}

export interface RevokeAllSessionsValue {
  creator: string;
}

export type GnoMessage
  = | { type: typeof GnoMessageType.BANK_MSG_SEND; value: BankSendValue }
    | { type: typeof GnoMessageType.VM_CALL; value: VmCallValue }
    | { type: typeof GnoMessageType.VM_ADDPKG; value: VmAddPackageValue }
    | { type: typeof GnoMessageType.VM_RUN; value: VmRunValue }
    | { type: typeof GnoMessageType.AUTH_CREATE_SESSION; value: CreateSessionValue }
    | { type: typeof GnoMessageType.AUTH_REVOKE_SESSION; value: RevokeSessionValue }
    | { type: typeof GnoMessageType.AUTH_REVOKE_ALL_SESSIONS; value: RevokeAllSessionsValue };
