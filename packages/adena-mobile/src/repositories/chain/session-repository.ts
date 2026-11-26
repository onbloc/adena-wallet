import { Network } from '../../domain/network';
import { ChainSession } from '../../domain/session-card';

export interface CreateSessionRequest {
  masterAddress: string;
  // 33-byte compressed secp256k1 public key of the session.
  publicKey: Uint8Array;
  allowPaths: string[];
  // Raw amount in the network's native denom.
  spendLimit: string;
  spendPeriod: number;
  // Unix seconds.
  expiresAt: number;
}

// Session accounts of a master account. Messages are typed by the chain adapter and signed by the master.
export interface SessionRepository {
  listSessions(masterAddress: string, network: Network): Promise<ChainSession[]>;
  // Null when the chain has no such session (never created, revoked or pruned).
  findSession(masterAddress: string, sessionAddress: string, network: Network): Promise<ChainSession | null>;
  buildCreateMessages(request: CreateSessionRequest, network: Network): unknown[];
  // `publicKey` is base64.
  buildRevokeMessages(masterAddress: string, publicKey: string): unknown[];
  buildRevokeAllMessages(masterAddress: string): unknown[];
  // Deployed realm packages at `path` or below it.
  listRealms(path: string, network: Network): Promise<string[]>;
  // The given realms whose public functions can move the caller's tokens (Transfer, Approve, ...).
  findTokenRealms(paths: string[], network: Network): Promise<string[]>;
}
