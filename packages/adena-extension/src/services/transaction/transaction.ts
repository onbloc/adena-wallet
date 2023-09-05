import {
  LedgerAccount,
  LedgerConnector,
  LedgerKeyring,
  StdSignature,
  TransactionBuilder,
  sha256,
  uint8ArrayToArray,
} from 'adena-module';
import { Account } from 'adena-module';
import { WalletService } from '..';
import { StdSignDoc } from 'adena-module/src';
import { Document } from 'adena-module/src/amino/document';
import { GnoProvider } from '@common/provider/gno/gno-provider';

export class TransactionService {
  private walletService: WalletService;

  private gnoProvider: GnoProvider | null;

  constructor(walletService: WalletService) {
    this.walletService = walletService;
    this.gnoProvider = null;
  }

  public getGnoProvider() {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }
    return this.gnoProvider;
  }

  public setGnoProvider(gnoProvider: GnoProvider) {
    this.gnoProvider = gnoProvider;
  }

  private getGasAmount = async (gasFee?: number) => {
    const gasFeeAmount = {
      value: `${gasFee ?? 1}`,
      denom: 'ugnot',
    };
    return gasFeeAmount;
  };

  public createDocument = async (
    account: Account,
    chainId: string,
    messages: Array<any>,
    gasWanted: number,
    gasFee?: number,
    memo?: string | undefined,
  ) => {
    const provider = this.getGnoProvider();
    const address = account.getAddress('g');
    const [accountSequence, accountNumber] = await Promise.all([
      provider.getAccountSequence(address),
      provider.getAccountNumber(address),
    ]).catch(() => [null, null]);
    const gasAmount = await this.getGasAmount(gasFee);
    if (accountSequence === null || accountNumber === null) {
      return Document.createDocument(
        '-1',
        '-1',
        chainId,
        messages,
        `${gasWanted}`,
        gasAmount,
        memo || '',
      );
    }
    return Document.createDocument(
      `${accountNumber}`,
      `${accountSequence}`,
      chainId,
      messages,
      `${gasWanted}`,
      gasAmount,
      memo || '',
    );
  };

  public createSignature = async (account: Account, document: StdSignDoc) => {
    const wallet = await this.walletService.loadWallet();
    const { signature } = await wallet.signByAccountId(account.id, document);
    return signature;
  };

  public createSignatureWithLedger = async (account: LedgerAccount, document: StdSignDoc) => {
    const connected = await LedgerConnector.openConnected();
    if (!connected) {
      throw new Error('Ledger not found');
    }
    const ledger = new LedgerConnector(connected);
    const ledgerKeyring = await LedgerKeyring.fromLedger(ledger);
    const { signature } = await ledgerKeyring
      .sign(document, account.hdPath)
      .finally(async () => await connected.close());
    return signature;
  };

  public createSignDocument = async (
    account: Account,
    chainId: string,
    messages: Array<any>,
    gasWanted: number,
    gasFee?: number,
    memo?: string | undefined,
  ) => {
    const document = await this.createDocument(account, chainId, messages, gasWanted, gasFee, memo);
    const signature = await this.createSignature(account, document);
    return { document, signature };
  };

  /**
   * This function creates a transaction.
   *
   * @param account Account instance
   * @param message message
   * @param gasWanted gaswanted
   * @param gasFee gas fee
   * @returns transaction value
   */
  public createTransaction = (document: StdSignDoc, signature: StdSignature) => {
    const transaction = TransactionBuilder.builder()
      .signDoucment(document)
      .signatures([signature])
      .build();
    const transactionValue = uint8ArrayToArray(transaction.encodedValue);
    return transactionValue;
  };

  /**
   * This function sends a transaction to gnoland
   *
   * @param gnoClient gno api client
   * @param transaction created transaction
   */
  public sendTransaction = async (transaction: Array<number>) => {
    const provider = this.getGnoProvider();
    const hash = await provider.sendTransaction(Buffer.from(transaction).toString('base64'));
    provider.waitResultForTransaction(hash).then(console.log);
    return hash;
  };

  public createHash(transaction: Array<number>) {
    const hash = sha256(new Uint8Array(transaction));
    return Buffer.from(hash).toString('base64');
  }
}
