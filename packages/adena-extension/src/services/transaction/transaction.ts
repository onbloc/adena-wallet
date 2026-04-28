import {
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  Tx,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import {
  Account,
  AdenaLedgerConnector,
  ChainRegistry,
  CosmosChain,
  CosmosDocument,
  CosmosFeeEstimate,
  CosmosNetworkProfile,
  CosmosSignMode,
  CosmosTxBroadcastResponse,
  Document,
  Keyring,
  LedgerAccount,
  LedgerKeyring,
  SignedCosmosTx,
  hasHDPath,
  sha256,
  signCosmosAmino,
  Wallet,
  compressPubkeyIfNeeded,
} from 'adena-module';
import type { AminoSignResponse, StdSignDoc } from '@cosmjs/amino';
import { encodeSecp256k1Pubkey, serializeSignDoc } from '@cosmjs/amino';
import type { DirectSignResponse } from '@cosmjs/proto-signing';
import { makeSignBytes } from '@cosmjs/proto-signing';
import type { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { GasToken } from '@common/constants/token.constant';
import { DEFAULT_GAS_FEE, DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { mappedDocumentMessagesWithCaller } from '@common/mapper/transaction-mapper';
import { CosmosLcdProvider } from '@common/provider/cosmos/cosmos-lcd-provider';
import { GnoProvider } from '@common/provider/gno/gno-provider';
import { WalletService } from '..';

export interface EncodeTxSignature {
  pubKey: {
    typeUrl: string | undefined;
    value: string | undefined;
  };
  signature: string;
}

export class TransactionService {
  private walletService: WalletService;

  private gnoProvider: GnoProvider | null;

  // ChainRegistry is optional so older construction sites (inject/message/methods)
  // keep working while the DI container in adena-provider wires it up.
  private chainRegistry: ChainRegistry | null;

  private cosmosProvider: CosmosLcdProvider | null;

  constructor(
    walletService: WalletService,
    gnoProvider: GnoProvider | null,
    chainRegistry: ChainRegistry | null = null,
    cosmosProvider: CosmosLcdProvider | null = null,
  ) {
    this.walletService = walletService;
    this.gnoProvider = gnoProvider;
    this.chainRegistry = chainRegistry;
    this.cosmosProvider = cosmosProvider;
  }

  public getGnoProvider(): GnoProvider {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }
    return this.gnoProvider;
  }

  public setGnoProvider(gnoProvider: GnoProvider): void {
    this.gnoProvider = gnoProvider;
  }

  public setChainRegistry(chainRegistry: ChainRegistry): void {
    this.chainRegistry = chainRegistry;
  }

  private resolveCosmosProfile(chainId: string): CosmosNetworkProfile {
    if (!this.chainRegistry) {
      throw new Error('ChainRegistry not initialized for Cosmos operations');
    }
    const profile = this.chainRegistry.getNetworkProfileByChainId(chainId);
    if (!profile || profile.chainType !== 'cosmos') {
      throw new Error(`Cosmos network profile not found for chainId: ${chainId}`);
    }
    return profile as CosmosNetworkProfile;
  }

  private resolvePreferredSignMode(chainId: string): CosmosSignMode {
    if (!this.chainRegistry) {
      throw new Error('ChainRegistry not initialized for Cosmos operations');
    }
    const chain = this.chainRegistry.getChainByChainId(chainId);
    if (!chain || chain.chainType !== 'cosmos') {
      throw new Error(`Cosmos chain not found for chainId: ${chainId}`);
    }
    return (chain as CosmosChain).signing.preferred;
  }

  /**
   * Create a document for transaction
   *
   * @param account
   * @param chainId
   * @param messages
   * @param gasWanted
   * @param gasFee
   * @param memo
   * @returns
   */
  public createDocument = async (
    account: Account,
    chainId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: any[],
    addressPrefix: string,
    gasWanted?: number,
    gasFee?: number,
    memo?: string | undefined,
  ): Promise<Document> => {
    const provider = this.getGnoProvider();
    const address = await account.getAddress(addressPrefix);
    const accountInfo = await provider.getAccountInfo(address).catch(() => null);
    const accountNumber = accountInfo?.accountNumber ?? 0;
    const accountSequence = accountInfo?.sequence ?? 0;
    return {
      msgs: mappedDocumentMessagesWithCaller(messages, address),
      fee: {
        amount: [
          {
            denom: GasToken.denom,
            amount: (gasFee || DEFAULT_GAS_FEE).toString(),
          },
        ],
        gas: (gasWanted || DEFAULT_GAS_WANTED).toString(),
      },
      chain_id: chainId,
      memo: memo || '',
      account_number: accountNumber.toString(),
      sequence: accountSequence.toString(),
    };
  };

  /** Create a signature
   *
   * @param account
   * @param document
   * @returns
   */
  public createSignature = async (
    account: Account,
    document: Document,
  ): Promise<EncodeTxSignature> => {
    const provider = this.getGnoProvider();
    const wallet = await this.walletService.loadWallet();
    const { signature } = await wallet.signByAccountId(provider, account.id, document);
    const signatures = signature.map((s) => ({
      pubKey: {
        typeUrl: s?.pub_key?.type_url,
        value: s?.pub_key?.value ? uint8ArrayToBase64(s.pub_key.value as Uint8Array) : undefined,
      },
      signature: uint8ArrayToBase64(s.signature),
    }));
    return signatures[0];
  };

  /**
   * This function creates a transaction.
   *
   * @param wallet
   * @param document
   * @returns
   */
  public createTransaction = async (
    wallet: Wallet,
    account: Account,
    document: Document,
  ): Promise<{ signed: Tx; signature: EncodeTxSignature[] }> => {
    const provider = this.getGnoProvider();
    const { signed, signature } = await wallet.signByAccountId(provider, account.id, document);
    const encodedSignature = signature.map((s) => ({
      pubKey: {
        typeUrl: s?.pub_key?.type_url,
        value: s?.pub_key?.value ? uint8ArrayToBase64(s.pub_key.value as Uint8Array) : undefined,
      },
      signature: uint8ArrayToBase64(s.signature),
    }));
    return { signed, signature: encodedSignature };
  };

  /**
   * This function creates a transaction.
   *
   * @param ledgerConnector
   * @param account
   * @param document
   * @returns
   */
  public createTransactionWithLedger = async (
    ledgerConnector: AdenaLedgerConnector,
    account: LedgerAccount,
    document: Document,
  ): Promise<{ signed: Tx; signature: EncodeTxSignature[] }> => {
    const provider = this.getGnoProvider();
    const keyring = await LedgerKeyring.fromLedger(ledgerConnector);
    const { signed, signature } = await keyring.sign(provider, document, account.hdPath);
    const encodedSignature = signature.map((s) => ({
      pubKey: {
        typeUrl: s?.pub_key?.type_url,
        value: s?.pub_key?.value ? uint8ArrayToBase64(s.pub_key.value as Uint8Array) : undefined,
      },
      signature: uint8ArrayToBase64(s.signature),
    }));
    return { signed, signature: encodedSignature };
  };

  /**
   * This function sends a transaction to gnoland
   *
   * @param wallet
   * @param account
   * @param transaction
   * @param commit
   * @returns
   */
  public sendTransaction = async (
    wallet: Wallet,
    account: Account,
    transaction: Tx,
    commit?: boolean,
  ): Promise<BroadcastTxCommitResult | BroadcastTxSyncResult> => {
    const provider = this.getGnoProvider();
    const broadcastTx = commit
      ? wallet.broadcastTxCommit.bind(wallet)
      : wallet.broadcastTxSync.bind(wallet);

    const result = await broadcastTx(provider, account.id, transaction);
    return result;
  };

  /**
   * This function sends a transaction to gnoland
   *
   * @param ledgerConnector
   * @param account
   * @param transaction
   * @param commit
   * @returns
   */
  public sendTransactionByLedger = async (
    ledgerConnector: AdenaLedgerConnector,
    account: LedgerAccount,
    transaction: Tx,
    commit?: boolean,
  ): Promise<BroadcastTxCommitResult | BroadcastTxSyncResult> => {
    const provider = this.getGnoProvider();
    const keyring = await LedgerKeyring.fromLedger(ledgerConnector);
    const broadcastTx = commit
      ? keyring.broadcastTxCommit.bind(keyring)
      : keyring.broadcastTxSync.bind(keyring);

    const result = await broadcastTx(provider, transaction, account.hdPath);
    return result;
  };

  // ─── Cosmos AMINO (Phase 3) ─────────────────────────────────────────
  // Thin passthrough to AdenaWallet's Cosmos methods. Gno methods above
  // remain untouched so Gno flows have zero regression risk.

  public signCosmos = async (
    accountId: string,
    document: CosmosDocument,
  ): Promise<SignedCosmosTx> => {
    if (!this.cosmosProvider) {
      throw new Error('CosmosProvider not injected');
    }
    this.resolveCosmosProfile(document.chainId);
    const wallet = await this.walletService.loadWallet();
    const signMode = this.resolvePreferredSignMode(document.chainId);
    return wallet.signCosmosByAccountId(
      accountId,
      document,
      this.cosmosProvider,
      signMode,
    );
  };

  /**
   * Sign an already-constructed Keplr `StdSignDoc` supplied by an external dApp.
   * Bypasses CosmosDocument translation — the caller owns signDoc construction
   * and the returned `signed` field echoes it verbatim (Keplr spec).
   */
  public signCosmosAminoDoc = async (
    accountId: string,
    signDoc: StdSignDoc,
  ): Promise<AminoSignResponse> => {
    const { account, keyring, hdPath } = await this.resolveCosmosSigner(accountId);
    if (account.type === 'LEDGER') {
      throw new Error('LEDGER_NOT_SUPPORTED');
    }
    const signBytes = serializeSignDoc(signDoc);
    const signature = await keyring.signRaw(signBytes, { hdPath });
    return {
      signed: signDoc,
      signature: {
        pub_key: encodeSecp256k1Pubkey(compressPubkeyIfNeeded(account.publicKey)),
        signature: Buffer.from(signature).toString('base64'),
      },
    };
  };

  /**
   * Direct-mode counterpart of `signCosmosAminoDoc`. `signDoc` is the native
   * protobuf `SignDoc` (Uint8Array bodyBytes/authInfoBytes, bigint
   * accountNumber); the inject wrapper re-serializes the echoed `signed`
   * before handing it back to the dApp.
   */
  public signCosmosDirectDoc = async (
    accountId: string,
    signDoc: SignDoc,
  ): Promise<DirectSignResponse> => {
    const { account, keyring, hdPath } = await this.resolveCosmosSigner(accountId);
    if (account.type === 'LEDGER') {
      throw new Error('LEDGER_NOT_SUPPORTED');
    }
    const signBytes = makeSignBytes(signDoc);
    const signature = await keyring.signRaw(signBytes, { hdPath });
    return {
      signed: signDoc,
      signature: {
        pub_key: encodeSecp256k1Pubkey(compressPubkeyIfNeeded(account.publicKey)),
        signature: Buffer.from(signature).toString('base64'),
      },
    };
  };

  private resolveCosmosSigner = async (
    accountId: string,
  ): Promise<{ account: Account; keyring: Keyring; hdPath: number | undefined }> => {
    const wallet = await this.walletService.loadWallet();
    const account = wallet.accounts.find((a) => a.id === accountId);
    if (!account) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }
    const keyring = wallet.keyrings.find((k) => k.id === account.keyringId);
    if (!keyring) {
      throw new Error('KEYRING_NOT_FOUND');
    }
    const hdPath = hasHDPath(account) ? account.hdPath : undefined;
    return { account, keyring, hdPath };
  };

  public estimateCosmosFee = async (
    accountId: string,
    document: CosmosDocument,
  ): Promise<CosmosFeeEstimate> => {
    if (!this.cosmosProvider) {
      throw new Error('CosmosProvider not injected');
    }
    const chain = this.resolveCosmosChain(document.chainId);
    const fallbackFee = chain.fee.fallbackFee;
    if (!fallbackFee) {
      throw new Error(
        `CosmosChain ${chain.chainGroup} has no fallbackFee configured`,
      );
    }
    // feeDenom: pick the first token returned by the chain's feeCurrencyFilter
    // (already scoped to the current msgs), stripping the "<chainId>:" prefix.
    const filter = chain.fee.feeCurrencyFilter;
    const allowedTokenIds = filter
      ? filter(document.msgs)
      : [chain.fee.defaultFeeTokenId];
    const firstAllowed = allowedTokenIds[0] ?? chain.fee.defaultFeeTokenId;
    const feeDenom = firstAllowed.includes(':')
      ? firstAllowed.split(':')[1]
      : firstAllowed;

    const wallet = await this.walletService.loadWallet();
    return wallet.estimateCosmosFeeByAccountId(
      accountId,
      document,
      this.cosmosProvider,
      fallbackFee,
      feeDenom,
    );
  };

  private resolveCosmosChain(chainId: string): CosmosChain {
    if (!this.chainRegistry) {
      throw new Error('ChainRegistry not initialized for Cosmos operations');
    }
    const chain = this.chainRegistry.getChainByChainId(chainId);
    if (!chain || chain.chainType !== 'cosmos') {
      throw new Error(`Cosmos chain not found for chainId: ${chainId}`);
    }
    return chain;
  }

  /**
   * AMINO-mode counterpart of `signCosmosAminoDoc` for Ledger accounts.
   * Uses a connector-bound LedgerKeyring instead of the wallet-owned one
   * (whose connector is null after restore) and delegates to the same
   * `signRaw` path that the Gno sign flow already exercises. Direct mode has
   * no Ledger counterpart — the Cosmos Ledger app only signs AMINO JSON, so
   * dApps must use `getOfflineSignerAuto` (which our `isNanoLedger` flag
   * already steers toward AMINO-only).
   */
  public signCosmosAminoDocWithLedger = async (
    ledgerConnector: AdenaLedgerConnector,
    account: LedgerAccount,
    signDoc: StdSignDoc,
  ): Promise<AminoSignResponse> => {
    const keyring = await LedgerKeyring.fromLedger(ledgerConnector);
    const signBytes = serializeSignDoc(signDoc);
    const signature = await keyring.signRaw(signBytes, { hdPath: account.hdPath });
    return {
      signed: signDoc,
      signature: {
        pub_key: encodeSecp256k1Pubkey(compressPubkeyIfNeeded(account.publicKey)),
        signature: Buffer.from(signature).toString('base64'),
      },
    };
  };

  /**
   * Sign a Cosmos document with a Ledger keyring. Parallel to `signCosmos` but
   * bypasses the wallet-owned keyring (whose connector is null after restore)
   * and uses a keyring freshly bound to an active `AdenaLedgerConnector`.
   */
  public signCosmosWithLedger = async (
    ledgerConnector: AdenaLedgerConnector,
    account: LedgerAccount,
    document: CosmosDocument,
  ): Promise<SignedCosmosTx> => {
    if (!this.cosmosProvider) {
      throw new Error('CosmosProvider not injected');
    }
    this.resolveCosmosProfile(document.chainId);
    // PR #822 (ADN-752) introduces a unified `signCosmos` dispatcher that
    // routes by `chain.signing.preferred`. Until #822 lands, hardcode the
    // AMINO pipeline — the Cosmos Ledger app only renders AMINO JSON
    // anyway, so AMINO is the only mode that produces a usable display
    // for Ledger users.
    const keyring = await LedgerKeyring.fromLedger(ledgerConnector);
    return signCosmosAmino({
      document,
      keyring,
      cosmosProvider: this.cosmosProvider,
      hdPath: account.hdPath,
    });
  };

  public broadcastCosmos = async (
    signedTx: SignedCosmosTx,
    chainId: string,
  ): Promise<CosmosTxBroadcastResponse> => {
    if (!this.cosmosProvider) {
      throw new Error('CosmosProvider not injected');
    }
    this.resolveCosmosProfile(chainId);
    const wallet = await this.walletService.loadWallet();
    const result = await wallet.broadcastCosmosTx(signedTx, this.cosmosProvider);
    this.cosmosProvider.invalidate();
    return result;
  };

  /**
   * create a transaction hash
   *
   * @param transaction
   * @returns
   */
  public createHash(transaction: Tx): string {
    const hash = sha256(Tx.encode(transaction).finish());
    return Buffer.from(hash).toString('base64');
  }

  /**
   * encode a transaction to base64
   *
   * @param transaction
   * @returns
   */
  public encodeTransaction(transaction: Tx): string {
    return uint8ArrayToBase64(Tx.encode(transaction).finish());
  }
}
