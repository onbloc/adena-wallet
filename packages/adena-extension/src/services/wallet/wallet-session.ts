import {
  AdenaWallet,
  ChainRegistry,
  fromBase64,
  publicKeyToAddress,
  SessionAccount,
  SessionConfig,
  SessionKeyring,
  validateAddress,
} from 'adena-module';
import { Wallet as Tm2Wallet } from '@gnolang/tm2-js-client';

import { GnoProvider } from '@common/provider/gno/gno-provider';
import { GnoSessionAccountResponse } from '@common/provider/gno/types';
import { SessionMetadataV020 } from '@migrates/migrations/v020/storage-model-v020';
import { SessionRepository } from '@repositories/session';
import { NetworkMetainfo } from '@types';

import { WalletService } from './wallet';

// Service-level errors raised by previewSessionImport / commitSessionImport.
// UI maps these to user-facing copy via the table in
// plans/account-sessions/phase-07-session-import.md.
export type SessionImportErrorReason =
  | 'invalid_private_key'
  | 'invalid_master_address'
  | 'unsupported_network'
  | 'no_sessions_found'
  | 'session_not_found'
  | 'session_expired'
  | 'session_already_imported'
  | 'session_pubkey_mismatch'
  | 'network_changed'
  | 'wallet_locked'
  | 'network_error';

export class SessionImportError extends Error {
  public readonly reason: SessionImportErrorReason;
  constructor(reason: SessionImportErrorReason, message?: string) {
    super(message ?? reason);
    this.reason = reason;
    this.name = 'SessionImportError';
  }
}

export interface SessionImportPreview {
  sessionAddr: string;
  chainId: string;
  addressPrefix: string;
  metadata: SessionMetadataV020;
  display: {
    expiresAt: number;
    allowPaths: string[];
    spendLimit: string;
    spendPeriod: number;
    spendUsed: string;
  };
}

export interface SessionImportCandidate extends SessionImportPreview {
  alreadyImported: boolean;
  isExpired: boolean;
}

export interface SessionImportRequest {
  sessionAddr: string;
  privKey: string;
}

export interface SessionPostSaveMetadata {
  sessionAddr: string;
  metadata: SessionMetadataV020;
}

const PRIVKEY_HEX_REGEX = /^(0x)?[0-9a-fA-F]{64}$/;

// WalletSessionService implements Phase 7 session-import flow.
//
// The two-step preview/commit split lets the UI show session details from
// the chain before the user has to unlock their wallet: preview is a pure
// read (provider.getSession), commit is the wallet-mutating step that
// requires unlocked wallet state.
export class WalletSessionService {
  private walletService: WalletService;
  private sessionRepository: SessionRepository;
  private gnoProvider: GnoProvider | null;
  private chainRegistry: ChainRegistry;

  constructor(
    walletService: WalletService,
    sessionRepository: SessionRepository,
    gnoProvider: GnoProvider | null,
    chainRegistry: ChainRegistry,
  ) {
    this.walletService = walletService;
    this.sessionRepository = sessionRepository;
    this.gnoProvider = gnoProvider;
    this.chainRegistry = chainRegistry;
  }

  public previewSessionImport = async (
    sessionPrivKeyHex: string,
    masterAddress: string,
    currentNetwork: NetworkMetainfo,
  ): Promise<SessionImportPreview> => {
    return this.previewSessionImportInternal(sessionPrivKeyHex, masterAddress, currentNetwork);
  };

  public previewSessionImportForAddress = async (
    sessionPrivKeyHex: string,
    masterAddress: string,
    sessionAddr: string,
    currentNetwork: NetworkMetainfo,
  ): Promise<SessionImportPreview> => {
    return this.previewSessionImportInternal(
      sessionPrivKeyHex,
      masterAddress,
      currentNetwork,
      sessionAddr,
    );
  };

  public listImportableSessions = async (
    masterAddress: string,
    currentNetwork: NetworkMetainfo,
  ): Promise<SessionImportCandidate[]> => {
    this.assertGnoNetwork(currentNetwork);
    const normalizedMasterAddress = this.assertValidMasterAddress(
      masterAddress,
      currentNetwork.addressPrefix,
    );

    if (!this.gnoProvider) {
      throw new SessionImportError('network_error', 'Gno provider not initialized');
    }

    let responses: GnoSessionAccountResponse[];
    try {
      responses = await this.gnoProvider.getSessions(normalizedMasterAddress);
    } catch (e) {
      throw new SessionImportError('network_error', (e as Error)?.message);
    }

    if (responses.length === 0) {
      throw new SessionImportError('no_sessions_found');
    }

    const storedSessions = await this.sessionRepository.getAll();
    const walletSessionAddrs = await this.getCurrentWalletSessionAddresses(
      currentNetwork.addressPrefix,
    );

    return responses.map((res) => {
      const sessionAddr = res.BaseSessionAccount.BaseAccount.address;
      return {
        ...this.createPreviewFromRecord(
          normalizedMasterAddress,
          currentNetwork,
          sessionAddr,
          res,
        ),
        alreadyImported: walletSessionAddrs
          ? walletSessionAddrs.has(sessionAddr)
          : !!storedSessions[sessionAddr],
        isExpired: !this.isActiveSessionRecord(res),
      };
    });
  };

  public commitSessionImport = async (
    preview: SessionImportPreview,
    currentNetwork: NetworkMetainfo,
    sessionPrivKeyHex: string,
  ): Promise<SessionAccount> => {
    const accounts = await this.commitSessionImports([preview], currentNetwork, {
      [preview.sessionAddr]: sessionPrivKeyHex,
    });
    return accounts[0];
  };

  public commitSessionImports = async (
    previews: SessionImportPreview[],
    currentNetwork: NetworkMetainfo,
    privKeyBySessionAddr: Record<string, string>,
  ): Promise<SessionAccount[]> => {
    if (previews.length === 0) {
      throw new SessionImportError('no_sessions_found');
    }

    for (const preview of previews) {
      this.assertPreviewNetwork(preview, currentNetwork);
    }

    if (await this.walletService.isLocked()) {
      throw new SessionImportError('wallet_locked');
    }

    if (!this.gnoProvider) {
      throw new SessionImportError('network_error', 'Gno provider not initialized');
    }

    const wallet = await this.walletService.loadWallet();
    const existingWalletSessionAddrs = await this.getWalletSessionAddresses(
      wallet,
      currentNetwork.addressPrefix,
    );
    const seenSessionAddrs = new Set<string>();
    const cloned = wallet.clone();
    const accounts: SessionAccount[] = [];
    const entries: SessionPostSaveMetadata[] = [];

    for (const preview of previews) {
      if (seenSessionAddrs.has(preview.sessionAddr)) {
        throw new SessionImportError('session_already_imported');
      }
      seenSessionAddrs.add(preview.sessionAddr);

      if (existingWalletSessionAddrs.has(preview.sessionAddr)) {
        throw new SessionImportError('session_already_imported');
      }

      const sessionInStorage = await this.sessionRepository.get(preview.sessionAddr);
      if (sessionInStorage) {
        await this.sessionRepository.remove(preview.sessionAddr).catch(() => undefined);
      }

      let recheck: GnoSessionAccountResponse | null;
      try {
        recheck = await this.gnoProvider.getSession(
          preview.metadata.masterAddress,
          preview.sessionAddr,
        );
      } catch (e) {
        throw new SessionImportError('network_error', (e as Error)?.message);
      }
      if (!recheck) {
        throw new SessionImportError('session_not_found');
      }

      const artifact = await this.createSessionArtifact(
        preview,
        currentNetwork,
        privKeyBySessionAddr[preview.sessionAddr] ?? '',
        cloned.nextSessionAccountName,
        cloned.lastSessionAccountIndex + 1,
      );
      this.assertPublicKeyMatchesRecord(artifact.publicKey, recheck);

      cloned.addKeyring(artifact.keyring);
      cloned.addAccount(artifact.account);
      accounts.push(artifact.account);
      entries.push({
        sessionAddr: preview.sessionAddr,
        metadata: preview.metadata,
      });
    }

    await this.sessionRepository.setMany(entries);

    try {
      await this.walletService.updateWallet(cloned);
    } catch (e) {
      await Promise.all(
        entries.map((entry) =>
          this.sessionRepository.remove(entry.sessionAddr).catch(() => undefined),
        ),
      );
      throw e;
    }

    return accounts;
  };

  // Fresh-install path. Caller (session-add-screen Import tab) hits this
  // when no wallet vault exists yet: validate the session against chain,
  // build an empty AdenaWallet that contains only the imported session
  // account, and return both the wallet and the metadata draft for the
  // caller to hand off to WebCreatePassword via pendingWalletStore.
  //
  // No persistence happens here: SESSIONS storage write and wallet vault
  // save both run inside useCreatePasswordScreen after the user sets a
  // password, so a user who backs out of CreatePassword leaves no orphan
  // SESSIONS entry.
  public bootstrapSessionImport = async (
    sessionPrivKeyHex: string,
    masterAddress: string,
    currentNetwork: NetworkMetainfo,
  ): Promise<{
    wallet: AdenaWallet;
    sessionAddr: string;
    metadata: SessionMetadataV020;
  }> => {
    const preview = await this.previewSessionImport(
      sessionPrivKeyHex,
      masterAddress,
      currentNetwork,
    );
    const result = await this.bootstrapSessionImportPreviews(
      [preview],
      currentNetwork,
      { [preview.sessionAddr]: sessionPrivKeyHex },
    );

    return {
      wallet: result.wallet,
      sessionAddr: preview.sessionAddr,
      metadata: preview.metadata,
    };
  };

  public bootstrapSessionImportPreviews = async (
    previews: SessionImportPreview[],
    currentNetwork: NetworkMetainfo,
    privKeyBySessionAddr: Record<string, string>,
  ): Promise<{
    wallet: AdenaWallet;
    sessions: SessionPostSaveMetadata[];
  }> => {
    if (previews.length === 0) {
      throw new SessionImportError('no_sessions_found');
    }

    const wallet = new AdenaWallet();
    const sessions: SessionPostSaveMetadata[] = [];
    const seenSessionAddrs = new Set<string>();

    for (const preview of previews) {
      this.assertPreviewNetwork(preview, currentNetwork);
      if (seenSessionAddrs.has(preview.sessionAddr)) {
        throw new SessionImportError('session_already_imported');
      }
      seenSessionAddrs.add(preview.sessionAddr);

      const artifact = await this.createSessionArtifact(
        preview,
        currentNetwork,
        privKeyBySessionAddr[preview.sessionAddr] ?? '',
        wallet.nextSessionAccountName,
        wallet.lastSessionAccountIndex + 1,
      );

      wallet.addKeyring(artifact.keyring);
      wallet.addAccount(artifact.account);
      sessions.push({
        sessionAddr: preview.sessionAddr,
        metadata: preview.metadata,
      });

      if (sessions.length === 1) {
        wallet.currentAccountId = artifact.account.id;
      }
    }

    return { wallet, sessions };
  };

  private assertGnoNetwork = (currentNetwork: NetworkMetainfo): void => {
    const chain = this.chainRegistry.getChainByChainId(currentNetwork.chainId);
    if (!chain || chain.chainGroup !== 'gno' || currentNetwork.addressPrefix !== 'g') {
      throw new SessionImportError('unsupported_network');
    }
  };

  private assertPreviewNetwork = (
    preview: SessionImportPreview,
    currentNetwork: NetworkMetainfo,
  ): void => {
    if (
      currentNetwork.chainId !== preview.chainId ||
      currentNetwork.addressPrefix !== preview.addressPrefix
    ) {
      throw new SessionImportError('network_changed');
    }
  };

  private normalizePrivKeyHex = (input: string): string => {
    const trimmed = input.trim();
    if (!PRIVKEY_HEX_REGEX.test(trimmed)) {
      throw new SessionImportError('invalid_private_key');
    }
    return trimmed.startsWith('0x') ? trimmed.slice(2) : trimmed;
  };

  private assertValidMasterAddress = (
    address: string,
    prefix: string,
  ): string => {
    const trimmed = address.trim();
    if (!trimmed) {
      throw new SessionImportError('invalid_master_address');
    }
    if (!validateAddress(trimmed)) {
      throw new SessionImportError('invalid_master_address');
    }
    if (!trimmed.startsWith(prefix + '1')) {
      throw new SessionImportError('invalid_master_address');
    }
    return trimmed;
  };

  private previewSessionImportInternal = async (
    sessionPrivKeyHex: string,
    masterAddress: string,
    currentNetwork: NetworkMetainfo,
    expectedSessionAddr?: string,
  ): Promise<SessionImportPreview> => {
    this.assertGnoNetwork(currentNetwork);

    const normalizedPrivKey = this.normalizePrivKeyHex(sessionPrivKeyHex);
    const normalizedMasterAddress = this.assertValidMasterAddress(
      masterAddress,
      currentNetwork.addressPrefix,
    );
    const normalizedExpectedSessionAddr = expectedSessionAddr?.trim();

    const { publicKey, sessionAddr: derivedSessionAddr } = await this.deriveSessionIdentity(
      normalizedPrivKey,
      currentNetwork.addressPrefix,
    );
    const sessionAddr = normalizedExpectedSessionAddr ?? derivedSessionAddr;
    if (normalizedExpectedSessionAddr && derivedSessionAddr !== normalizedExpectedSessionAddr) {
      throw new SessionImportError('session_pubkey_mismatch');
    }

    const existingMetadata = await this.sessionRepository.get(sessionAddr);
    if (existingMetadata) {
      const existsInWallet = await this.sessionExistsInCurrentWallet(
        sessionAddr,
        currentNetwork.addressPrefix,
      );
      if (existsInWallet !== false) {
        throw new SessionImportError('session_already_imported');
      }
      await this.sessionRepository.remove(sessionAddr).catch(() => undefined);
    }

    if (!this.gnoProvider) {
      throw new SessionImportError('network_error', 'Gno provider not initialized');
    }
    let res: GnoSessionAccountResponse | null;
    try {
      res = await this.gnoProvider.getSession(normalizedMasterAddress, sessionAddr);
    } catch (e) {
      throw new SessionImportError('network_error', (e as Error)?.message);
    }
    if (!res) {
      throw new SessionImportError('session_not_found');
    }

    this.assertPublicKeyMatchesRecord(publicKey, res);

    return this.createPreviewFromRecord(
      normalizedMasterAddress,
      currentNetwork,
      sessionAddr,
      res,
    );
  };

  private createPreviewFromRecord = (
    masterAddress: string,
    currentNetwork: NetworkMetainfo,
    sessionAddr: string,
    res: GnoSessionAccountResponse,
  ): SessionImportPreview => {
    const expiresAt = Number(res.BaseSessionAccount.expires_at);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const spendPeriod = Number(res.BaseSessionAccount.spend_period ?? 0);
    const spendUsed = res.BaseSessionAccount.spend_used ?? '';
    const spendReset =
      res.BaseSessionAccount.spend_reset != null
        ? Number(res.BaseSessionAccount.spend_reset)
        : undefined;
    const spendLimit = res.BaseSessionAccount.spend_limit ?? '';
    const allowPaths = res.allow_paths ?? [];
    const status = this.isActiveSessionRecord(res) ? 'ACTIVE' : 'EXPIRED';

    const metadata: SessionMetadataV020 = {
      masterAddress,
      chainId: currentNetwork.chainId,
      allowPaths,
      spendLimit,
      spendPeriod,
      spendUsed: spendUsed === '' ? undefined : spendUsed,
      spendReset,
      expiresAt,
      status,
      createdAt: nowSeconds,
    };

    return {
      sessionAddr,
      chainId: currentNetwork.chainId,
      addressPrefix: currentNetwork.addressPrefix,
      metadata,
      display: {
        expiresAt,
        allowPaths,
        spendLimit,
        spendPeriod,
        spendUsed,
      },
    };
  };

  private isActiveSessionRecord = (res: GnoSessionAccountResponse): boolean => {
    const expiresAt = Number(res.BaseSessionAccount.expires_at);
    const nowSeconds = Math.floor(Date.now() / 1000);
    return expiresAt <= 0 || nowSeconds < expiresAt;
  };

  private assertPublicKeyMatchesRecord = (
    publicKey: Uint8Array,
    res: GnoSessionAccountResponse,
  ): void => {
    const chainPubKeyB64 = res.BaseSessionAccount.BaseAccount.public_key?.value;
    if (!chainPubKeyB64) {
      throw new SessionImportError('session_pubkey_mismatch');
    }
    const chainPubKeyBytes = fromBase64(chainPubKeyB64);
    if (!arraysEqual(publicKey, chainPubKeyBytes)) {
      throw new SessionImportError('session_pubkey_mismatch');
    }
  };

  private createSessionArtifact = async (
    preview: SessionImportPreview,
    currentNetwork: NetworkMetainfo,
    sessionPrivKeyHex: string,
    accountName: string,
    accountIndex: number,
  ): Promise<{
    keyring: SessionKeyring;
    account: SessionAccount;
    publicKey: Uint8Array;
  }> => {
    const normalizedPrivKey = this.normalizePrivKeyHex(sessionPrivKeyHex);
    const { publicKey, sessionAddr } = await this.deriveSessionIdentity(
      normalizedPrivKey,
      currentNetwork.addressPrefix,
    );
    if (sessionAddr !== preview.sessionAddr) {
      throw new SessionImportError('session_pubkey_mismatch');
    }

    const privateKeyBytes = hexToBytes(normalizedPrivKey);
    const keyring = new SessionKeyring({
      publicKey: Array.from(publicKey),
      privateKey: Array.from(privateKeyBytes),
      masterAddress: preview.metadata.masterAddress,
    });
    const sessionConfig: SessionConfig = {
      masterAddress: preview.metadata.masterAddress,
      chainId: preview.chainId,
      status: preview.metadata.status,
      expiresAt: preview.metadata.expiresAt,
      allowPaths: preview.metadata.allowPaths,
      spendLimit: preview.metadata.spendLimit,
      spendPeriod: preview.metadata.spendPeriod,
    };
    const account = SessionAccount.createBy(keyring, accountName, sessionConfig);
    account.index = accountIndex;
    return { keyring, account, publicKey };
  };

  private getWalletSessionAddresses = async (
    wallet: AdenaWallet,
    addressPrefix: string,
  ): Promise<Set<string>> => {
    const addrs = new Set<string>();
    for (const existing of wallet.accounts) {
      if (existing.type !== 'SESSION') continue;
      addrs.add(await existing.getAddress(addressPrefix));
    }
    return addrs;
  };

  private getCurrentWalletSessionAddresses = async (
    addressPrefix: string,
  ): Promise<Set<string> | null> => {
    const existsWallet = await this.walletService.existsWallet().catch(() => false);
    if (!existsWallet) {
      return new Set();
    }
    const locked = await this.walletService.isLocked().catch(() => true);
    if (locked) {
      return null;
    }
    try {
      const wallet = await this.walletService.loadWallet();
      return this.getWalletSessionAddresses(wallet, addressPrefix);
    } catch {
      return null;
    }
  };

  private sessionExistsInCurrentWallet = async (
    sessionAddr: string,
    addressPrefix: string,
  ): Promise<boolean | null> => {
    const sessionAddrs = await this.getCurrentWalletSessionAddresses(addressPrefix);
    if (!sessionAddrs) {
      return null;
    }
    return sessionAddrs.has(sessionAddr);
  };

  private deriveSessionIdentity = async (
    privKeyHex: string,
    addressPrefix: string,
  ): Promise<{ publicKey: Uint8Array; sessionAddr: string }> => {
    const privateKeyBytes = hexToBytes(privKeyHex);
    const tmWallet = await Tm2Wallet.fromPrivateKey(privateKeyBytes);
    const publicKey = await tmWallet.getSigner().getPublicKey();
    const sessionAddr = await publicKeyToAddress(publicKey, addressPrefix);
    return { publicKey, sessionAddr };
  };
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
