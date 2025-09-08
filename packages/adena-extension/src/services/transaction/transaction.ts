import {
  BlockInfo,
  BlockResult,
  BroadcastTransactionMap,
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  ConsensusParams,
  defaultAddressPrefix,
  NetworkInfo,
  Status,
  Tx,
  TxResult,
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

import { GasToken } from '@common/constants/token.constant';
import { DEFAULT_GAS_FEE, DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { mappedDocumentMessagesWithCaller } from '@common/mapper/transaction-mapper';
import { GnoProvider } from '@common/provider/gno/gno-provider';
import { WalletService } from '..';
import { AccountInfo, GnoDocumentInfo } from '@common/provider/gno';
import { FunctionSignature } from '@gnolang/gno-js-client';
import { ResponseDeliverTx } from '@gnolang/tm2-js-client/bin/proto/tm2/abci';

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
    gasWanted?: number,
    gasFee?: number,
    memo?: string | undefined,
  ): Promise<Document> => {
    const provider = this.getGnoProvider();
    const address = await account.getAddress(defaultAddressPrefix);
    const accountInfo = await provider.getAccount(address).catch(() => null);
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
    multisig?: {accountNumber: number, sequence: number},
  ): Promise<EncodeTxSignature> => {
    let provider = this.getGnoProvider();
    if (multisig) {
      provider = new MultisigProvider(provider, multisig.accountNumber, multisig.sequence)
    }
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
    multisig?: {accountNumber: number, sequence: number},
  ): Promise<{ signed: Tx; signature: EncodeTxSignature[] }> => {
    let provider = this.getGnoProvider();
    if (multisig) {
      provider = new MultisigProvider(provider, multisig.accountNumber, multisig.sequence)
    }
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

class MultisigProvider implements GnoProvider {
  prov: GnoProvider
  accountNumber: number
  sequence: number
  constructor(prov: GnoProvider, accountNumber: number, sequence: number) {
    this.prov = prov
    this.accountNumber = accountNumber
    this.sequence = sequence
  }
  public async getAccountNumber(address: string, height?: number | undefined): Promise<number> {
    return this.accountNumber
  }
  public async getAccountSequence(address: string, height?: number | undefined): Promise<number> {
    return this.sequence
  }
  public getGasPrice(height?: number | undefined): Promise<number> {
    return this.prov.getGasPrice(height)
  }
  public getAccount(address: string, height?: number | undefined): Promise<AccountInfo | null> {
    return this.prov.getAccount(address, height)
  }
  public getValueByEvaluateExpression(packagePath: string, functionName: string, params: (string | number)[]): Promise<string | null> {
   return  this.prov.getValueByEvaluateExpression(packagePath, functionName, params)
  }
  public sendTransactionSync(tx: string): Promise<BroadcastTxSyncResult> {
    return this.prov.sendTransactionSync(tx)
  }
  public sendTransactionCommit(tx: string): Promise<BroadcastTxCommitResult> {
    return this.prov.sendTransactionCommit(tx)
  }
  simulateTx(tx: Tx): Promise<ResponseDeliverTx> {
    return this.prov.simulateTx(tx)
  }
  public getRealmDocument(packagePath: string): Promise<GnoDocumentInfo | null> {
    return this.prov.getRealmDocument(packagePath)
  }
  evaluateExpression(packagePath: string, expression: string, height?: number): Promise<string> {
    return this.prov.evaluateExpression(packagePath, expression, height)
  }
  getFileContent(packagePath: string, height?: number): Promise<string> {
    return this.prov.getFileContent(packagePath, height)
  }
  getFunctionSignatures(packagePath: string, height?: number): Promise<FunctionSignature[]> {
    return this.prov.getFunctionSignatures(packagePath, height)
  }
  getRenderOutput(packagePath: string, path: string, height?: number): Promise<string> {
    throw new Error('Method not implemented.');
  }
  protected baseURL: string;
  estimateGas(tx: Tx): Promise<number> {
    throw new Error('Method not implemented.');
  }
  getBalance(address: string, denomination?: string, height?: number): Promise<number> {
    throw new Error('Method not implemented.');
  }
  getBlock(height: number): Promise<BlockInfo> {
    throw new Error('Method not implemented.');
  }
  getBlockResult(height: number): Promise<BlockResult> {
    throw new Error('Method not implemented.');
  }
  getBlockNumber(): Promise<number> {
    throw new Error('Method not implemented.');
  }
  getConsensusParams(height: number): Promise<ConsensusParams> {
    throw new Error('Method not implemented.');
  }
  getNetwork(): Promise<NetworkInfo> {
    return this.prov.getNetwork()
  }
  getStatus(): Promise<Status> {
    return this.prov.getStatus()
  }
  getTransaction(hash: string): Promise<TxResult> {
    throw new Error('Method not implemented.');
  }
  sendTransaction<K extends keyof BroadcastTransactionMap>(tx: string, endpoint: K): Promise<BroadcastTransactionMap[K]['result']> {
    throw new Error('Method not implemented.');
  }
  waitForTransaction(hash: string, fromHeight?: number, timeout?: number): Promise<Tx> {
    throw new Error('Method not implemented.');
  }
}