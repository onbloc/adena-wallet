import { ripemd160, Secp256k1, sha256 } from '@cosmjs/crypto';
import { fromBase64, toBase64, toBech32, toHex } from '@cosmjs/encoding';
import { KeySigner, TM2Error, TransactionEndpoint, Tx } from '@gnolang/tm2-js-client';

import { AppError, AppErrorCode, PINNED_SEQUENCE_MISMATCH_MESSAGE, TransactionPendingError } from '../../../core/errors';
import { TokenBalance } from '../../../domain/account';
import { FeeEstimate, GNO_FEE_POLICY } from '../../../domain/fee';
import { ChainFamily, Network } from '../../../domain/network';
import {
  BroadcastResult,
  MessageSummary,
  SignedTransaction,
  SignerSequence,
  TransactionDraft,
  TransactionFee,
  TransactionLookup,
  TransactionStatus,
} from '../../../domain/transaction';
import { isValidAddress, normalizeAddress } from '../../../utils/address';
import { formatTokenAmount, parseCoin } from '../../../utils/amount';
import { BigNumber } from '../../../utils/big-number';
import { ChainRepository, SigningKey, SimulationSigner } from '../chain-repository';
import { parseGnoMessages } from './gno-message-parser';
import { GnoMessage, GnoMessageType } from './gno-messages';
import { GnoProvider, GnoProviderFactory } from './gno-provider';
import { requiresSignedSimulation, simulateGnoTx, staticCodeGasUsed } from './gno-simulation';
import {
  buildGnoSignBytes,
  buildGnoTxSignature,
  buildSimulationGnoTx,
  buildUnsignedGnoTx,
  feeSizeHeadroomBytes,
} from './gno-tx-encoder';

export interface GnoFeePolicy {
  // Gno default gas price: 1ugnot per 1000 gas.
  defaultGasPrice: { amount: number; gas: number };
  // Probe budget when the node's Block.MaxGas cannot be read.
  simulationGasWanted: string;
  // Probe budget when Block.MaxGas is -1 (unbounded); tm2's default block limit.
  unboundedSimulationGasWanted: string;
  // auth param TxSizeCostPerByte (tm2 default 10).
  txSizeCostPerByte: number;
}

export const DEFAULT_GNO_FEE_POLICY: GnoFeePolicy = {
  defaultGasPrice: { amount: 1, gas: 1000 },
  simulationGasWanted: '100000000',
  unboundedSimulationGasWanted: '3000000000',
  txSizeCostPerByte: 10,
};

const decodeAbciData = (data: string | null): string => {
  if (!data) {
    return '';
  }

  const text = new TextDecoder().decode(fromBase64(data));

  try {
    const parsed = JSON.parse(text);

    return typeof parsed === 'string' ? parsed : text;
  }
  catch {
    return text;
  }
};

const toNetworkError = (error: unknown): AppError =>
  error instanceof AppError ? error : new AppError(AppErrorCode.NETWORK_ERROR, (error as Error)?.message, { cause: error });

// tm2 NoTxResultForHashError, relayed by the RPC client inside the JSON-RPC error text.
const isTxNotFound = (error: unknown): boolean => /could not find tx result for hash/i.test((error as Error)?.message ?? '');

const UINT = /^\d+$/;

export class GnoChainRepository implements ChainRepository<GnoMessage> {
  readonly family = ChainFamily.GNO;

  constructor(
    private readonly providerFactory: GnoProviderFactory,
    private readonly feePolicy: GnoFeePolicy = DEFAULT_GNO_FEE_POLICY,
  ) {}

  private provider(network: Network): Promise<GnoProvider> {
    return this.providerFactory(network.rpcUrl);
  }

  deriveAddress(publicKey: Uint8Array, network: Network): string {
    return toBech32(network.addressPrefix, ripemd160(sha256(publicKey)));
  }

  isValidAddress(address: string, network: Network): boolean {
    return isValidAddress(address, network.addressPrefix);
  }

  normalizeAddress(address: string, network: Network): string | null {
    return normalizeAddress(address, network.addressPrefix);
  }

  async getChainId(network: Network): Promise<string> {
    try {
      const status = await (await this.provider(network)).getStatus();

      return status.node_info.network;
    }
    catch (error) {
      throw toNetworkError(error);
    }
  }

  async getNativeBalance(address: string, network: Network): Promise<TokenBalance> {
    const { denom, symbol, decimals } = network.nativeToken;

    try {
      const provider = await this.provider(network);
      const response = await provider.abciQuery({
        path: `bank/balances/${address}`,
        data: new Uint8Array(),
        height: 0,
        prove: false,
      });
      const coins = decodeAbciData(response.response.ResponseBase.Data);
      const coin = coins.split(',').map(parseCoin).find(parsed => parsed?.denom === denom);

      return { denom, symbol, decimals, amount: coin?.amount ?? '0' };
    }
    catch (error) {
      throw toNetworkError(error);
    }
  }

  parseMessages(raw: unknown[], signerAddress: string): GnoMessage[] {
    return parseGnoMessages(raw, signerAddress);
  }

  describeMessages(messages: GnoMessage[], network: Network): MessageSummary[] {
    const { denom, symbol, decimals } = network.nativeToken;
    const formatCoins = (coins: string): string =>
      coins
        ? coins.split(',').map((coin) => {
            const parsed = parseCoin(coin);

            return parsed?.denom === denom ? `${formatTokenAmount(parsed.amount, decimals)} ${symbol}` : coin;
          }).join(', ')
        : `0 ${symbol}`;

    // The storage deposit cap is spendable too, so it is shown whenever the message sets one.
    const maxDeposit = (coins: string): { label: string; value: string }[] =>
      coins ? [{ label: 'Max deposit', value: formatCoins(coins) }] : [];

    return messages.map((message) => {
      switch (message.type) {
        case GnoMessageType.BANK_MSG_SEND:
          return {
            title: 'Transfer',
            details: [
              { label: 'To', value: message.value.to_address },
              { label: 'Amount', value: formatCoins(message.value.amount) },
            ],
          };
        case GnoMessageType.VM_CALL:
          return {
            title: 'Call',
            details: [
              { label: 'Package', value: message.value.pkg_path },
              { label: 'Function', value: message.value.func },
              { label: 'Arguments', value: (message.value.args ?? []).join(', ') || '-' },
              { label: 'Send', value: formatCoins(message.value.send) },
              ...maxDeposit(message.value.max_deposit),
            ],
          };
        case GnoMessageType.VM_ADDPKG:
          return {
            title: 'Add package',
            details: [
              { label: 'Package', value: message.value.package.path },
              { label: 'Files', value: String(message.value.package.files.length) },
              { label: 'Send', value: formatCoins(message.value.send) },
              ...maxDeposit(message.value.max_deposit),
            ],
          };
        case GnoMessageType.VM_RUN:
          return {
            title: 'Run',
            details: [
              { label: 'Files', value: message.value.package.files.map(file => file.name).join(', ') },
              { label: 'Send', value: formatCoins(message.value.send) },
              ...maxDeposit(message.value.max_deposit),
            ],
          };
      }
    });
  }

  async estimateFee(draft: TransactionDraft<GnoMessage>, signer: SimulationSigner, network: Network): Promise<FeeEstimate> {
    const provider = await this.provider(network).catch((error) => {
      throw toNetworkError(error);
    });
    const chainPrice = await provider.getGasPrice().catch(() => null);
    const gasPrice = chainPrice ?? this.feePolicy.defaultGasPrice;
    const denom = network.nativeToken.denom;
    const probeFee: TransactionFee = { gasWanted: await this.simulationGasWanted(provider), gasFee: `1${denom}` };
    const toEstimate = (gasUsed: bigint, storageDeposit = '0'): FeeEstimate => ({
      gasUsed: gasUsed.toString(),
      storageDeposit,
      gasPrice: new BigNumber(gasPrice.amount).dividedBy(gasPrice.gas).toFixed(),
      denom: network.feeToken.denom,
      policy: GNO_FEE_POLICY,
    });

    // Code-bearing messages are only simulated with a real signature; without a key
    // (locked overlay session) the extension's static gas table stands in.
    const signed = requiresSignedSimulation(draft.messages);

    if (signed && !signer.withKey) {
      return toEstimate(staticCodeGasUsed(draft.messages));
    }

    try {
      const tx = signed && signer.withKey
        ? await signer.withKey(async key => (await this.signGnoTx(provider, { ...draft, fee: probeFee }, key, network)).tx)
        : buildSimulationGnoTx(draft.messages, probeFee, draft.memo, signer.publicKey);
      const simulation = await simulateGnoTx(provider, tx, denom);
      // The final fee can encode longer than the probe fee, and tx bytes are charged as gas.
      const sizeHeadroom = BigInt(feeSizeHeadroomBytes(probeFee, network.feeToken.denom) * this.feePolicy.txSizeCostPerByte);

      return toEstimate(simulation.gasUsed + sizeHeadroom, simulation.storageDeposit);
    }
    catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(AppErrorCode.TRANSACTION_FAILED, (error as Error)?.message ?? 'Transaction simulation failed', { cause: error });
    }
  }

  // Gno rejects a probe whose gas_wanted exceeds the block's MaxGas, even when simulating.
  private async simulationGasWanted(provider: GnoProvider): Promise<string> {
    try {
      const params = await provider.getConsensusParams(await provider.getBlockNumber());
      const maxGas = BigInt(params.consensus_params.Block.MaxGas);

      if (maxGas === -1n) {
        return this.feePolicy.unboundedSimulationGasWanted;
      }

      return maxGas > 0n ? maxGas.toString() : this.feePolicy.simulationGasWanted;
    }
    catch {
      return this.feePolicy.simulationGasWanted;
    }
  }

  // Signs with draft.chainId; Wallet.signTransaction would re-read the chain id from the RPC.
  private async signGnoTx(
    provider: GnoProvider,
    draft: TransactionDraft<GnoMessage>,
    key: SigningKey,
    network: Network,
    pin?: SignerSequence,
  ): Promise<{ tx: Tx; accountNumber: string; sequence: string }> {
    const publicKey = Secp256k1.compressPubkey((await Secp256k1.makeKeypair(key.privateKey)).pubkey);
    const signer = new KeySigner(key.privateKey, publicKey, network.addressPrefix);
    const { account_number: accountNumber, sequence } = (await provider.getAccount(await signer.getAddress())).BaseAccount;

    if (pin && (pin.sequence !== sequence || (pin.accountNumber !== undefined && pin.accountNumber !== accountNumber))) {
      throw new AppError(AppErrorCode.PREVIOUS_TRANSACTION_PENDING, PINNED_SEQUENCE_MISMATCH_MESSAGE);
    }

    const tx = buildUnsignedGnoTx(draft.messages, draft.fee, draft.memo);
    const signBytes = buildGnoSignBytes(tx, draft.chainId, accountNumber, sequence);

    return { tx: { ...tx, signatures: [buildGnoTxSignature(publicKey, await signer.signData(signBytes))] }, accountNumber, sequence };
  }

  async signTransaction(draft: TransactionDraft<GnoMessage>, key: SigningKey, network: Network, pin?: SignerSequence): Promise<SignedTransaction> {
    const provider = await this.provider(network).catch((error) => {
      throw toNetworkError(error);
    });
    const chainId = await this.getChainId(network);

    if (chainId !== draft.chainId) {
      throw new AppError(AppErrorCode.NETWORK_MISMATCH, `Expected chain ${draft.chainId} but RPC reports ${chainId}`);
    }

    try {
      const { tx, accountNumber, sequence } = await this.signGnoTx(provider, draft, key, network, pin);

      return { encoded: toBase64(Tx.encode(tx).finish()), accountNumber, sequence };
    }
    catch (error) {
      throw toNetworkError(error);
    }
  }

  transactionHash(signed: SignedTransaction): string {
    return gnoTxHash(signed);
  }

  async broadcastTransaction(signed: SignedTransaction, network: Network): Promise<BroadcastResult> {
    const provider = await this.provider(network).catch((error) => {
      throw toNetworkError(error);
    });

    try {
      const result = await provider.sendTransaction(signed.encoded, TransactionEndpoint.BROADCAST_TX_COMMIT);

      return { hash: result.hash, height: result.height, data: result.deliver_tx.ResponseBase.Data ?? undefined, committed: true };
    }
    catch (error) {
      // A TM2Error is the node's CheckTx/DeliverTx verdict; anything else (timeout, transport) leaves the outcome unknown.
      if (error instanceof TM2Error) {
        throw new AppError(AppErrorCode.TRANSACTION_FAILED, error.message || 'Broadcast failed', { cause: error });
      }

      throw new TransactionPendingError(gnoTxHash(signed), undefined, { cause: error });
    }
  }

  getTransactionStatus(hash: string, network: Network): Promise<TransactionStatus> {
    // Not indexed yet, or the node is unreachable.
    return this.findTransaction(hash, network).then(found => found ?? 'pending', () => 'pending');
  }

  async findTransaction(hash: string, network: Network): Promise<TransactionLookup> {
    try {
      const result = await (await this.provider(network)).getTransaction(hash);

      return result.tx_result.ResponseBase.Error ? 'failed' : 'committed';
    }
    catch (error) {
      if (isTxNotFound(error)) {
        return null;
      }

      throw toNetworkError(error);
    }
  }

  async getAccountSequence(address: string, network: Network): Promise<string> {
    try {
      const sequence = (await (await this.provider(network)).getAccount(address)).BaseAccount.sequence;

      if (!UINT.test(String(sequence))) {
        throw new AppError(AppErrorCode.NETWORK_ERROR, 'Unexpected account sequence');
      }

      return String(sequence);
    }
    catch (error) {
      throw toNetworkError(error);
    }
  }
}

// tm2 tx hash: sha256 of the encoded tx, hex like the RPC reports it.
export const gnoTxHash = (signed: SignedTransaction): string => toHex(sha256(fromBase64(signed.encoded))).toUpperCase();
