import {
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  Tx,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import {
  Account,
  AdenaLedgerConnector,
  Document,
  LedgerAccount,
  LedgerKeyring,
  sha256,
  Wallet,
} from 'adena-module';

import { GNOT_TOKEN } from '@common/constants/token.constant';
import { GnoProvider } from '@common/provider/gno/gno-provider';
import { WalletService } from '..';

interface EncodeTxSignature {
  pubKey: {
    typeUrl: string | undefined;
    value: string | undefined;
  };
  signature: string;
}

export class TransactionService {
  private walletService: WalletService;

  private gnoProvider: GnoProvider | null;

  constructor(walletService: WalletService, gnoProvider: GnoProvider | null) {
    this.walletService = walletService;
    this.gnoProvider = gnoProvider;
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

  private getGasAmount = async (gasFee?: number): Promise<{ amount: string; denom: string }> => {
    const gasFeeAmount = {
      amount: `${gasFee ?? 1}`,
      denom: GNOT_TOKEN.denom,
    };
    return gasFeeAmount;
  };

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
    gasWanted: number,
    gasFee?: number,
    memo?: string | undefined,
  ): Promise<Document> => {
    const provider = this.getGnoProvider();
    const address = await account.getAddress('g');
    const [accountSequence, accountNumber] = await Promise.all([
      provider.getAccountSequence(address),
      provider.getAccountNumber(address),
    ]).catch(() => [0, 0]);
    const gasAmount = await this.getGasAmount(gasFee);
    return {
      msgs: [...messages],
      fee: {
        amount: [gasAmount],
        gas: gasWanted.toString(),
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
        typeUrl: s?.pubKey?.typeUrl,
        value: s?.pubKey?.value ? uint8ArrayToBase64(s.pubKey.value as Uint8Array) : undefined,
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
    document: Document,
  ): Promise<{ signed: Tx; signature: EncodeTxSignature[] }> => {
    const provider = this.getGnoProvider();
    const { signed, signature } = await wallet.sign(provider, document);
    const encodedSignature = signature.map((s) => ({
      pubKey: {
        typeUrl: s?.pubKey?.typeUrl,
        value: s?.pubKey?.value ? uint8ArrayToBase64(s.pubKey.value as Uint8Array) : undefined,
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
        typeUrl: s?.pubKey?.typeUrl,
        value: s?.pubKey?.value ? uint8ArrayToBase64(s.pubKey.value as Uint8Array) : undefined,
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
