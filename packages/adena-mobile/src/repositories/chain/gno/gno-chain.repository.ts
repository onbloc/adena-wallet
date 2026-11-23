import { ripemd160, sha256 } from '@cosmjs/crypto';
import { fromBase64, toBase64, toBech32 } from '@cosmjs/encoding';
import { decodeTxMessages } from '@gnolang/gno-js-client';
import { TransactionEndpoint, Tx, Wallet } from '@gnolang/tm2-js-client';

import { AppError, AppErrorCode } from '../../../core/errors';
import { TokenBalance } from '../../../domain/account';
import { FeeEstimate, GNO_FEE_POLICY } from '../../../domain/fee';
import { ChainFamily, Network } from '../../../domain/network';
import {
  BroadcastResult,
  MessageSummary,
  SignedTransaction,
  TransactionDraft,
  TransactionFee,
} from '../../../domain/transaction';
import { isValidAddress } from '../../../utils/address';
import { formatTokenAmount, parseCoin } from '../../../utils/amount';
import { BigNumber } from '../../../utils/big-number';
import { ChainRepository, SigningKey, SimulationSigner } from '../chain-repository';
import { parseGnoMessages } from './gno-message-parser';
import { GnoMessage, GnoMessageType } from './gno-messages';
import { GnoProvider, GnoProviderFactory } from './gno-provider';
import { requiresSignedSimulation, simulateGnoTx, staticCodeGasUsed } from './gno-simulation';
import { buildSimulationGnoTx, buildUnsignedGnoTx } from './gno-tx-encoder';

export interface GnoFeePolicy {
  // Gno default gas price: 1ugnot per 1000 gas.
  defaultGasPrice: { amount: number; gas: number };
  simulationGasWanted: string;
}

export const DEFAULT_GNO_FEE_POLICY: GnoFeePolicy = {
  defaultGasPrice: { amount: 1, gas: 1000 },
  simulationGasWanted: '100000000',
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
            ],
          };
        case GnoMessageType.VM_ADDPKG:
          return {
            title: 'Add package',
            details: [
              { label: 'Package', value: message.value.package.path },
              { label: 'Files', value: String(message.value.package.files.length) },
              { label: 'Send', value: formatCoins(message.value.send) },
            ],
          };
        case GnoMessageType.VM_RUN:
          return {
            title: 'Run',
            details: [
              { label: 'Files', value: message.value.package.files.map(file => file.name).join(', ') },
              { label: 'Send', value: formatCoins(message.value.send) },
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
    const probeFee: TransactionFee = { gasWanted: this.feePolicy.simulationGasWanted, gasFee: `1${denom}` };
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
        ? await signer.withKey(key => this.signGnoTx(provider, { ...draft, fee: probeFee }, key, network))
        : buildSimulationGnoTx(draft.messages, probeFee, draft.memo, signer.publicKey);
      const simulation = await simulateGnoTx(provider, tx, denom);

      return toEstimate(simulation.gasUsed, simulation.storageDeposit);
    }
    catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(AppErrorCode.TRANSACTION_FAILED, (error as Error)?.message ?? 'Transaction simulation failed', { cause: error });
    }
  }

  private async signGnoTx(provider: GnoProvider, draft: TransactionDraft<GnoMessage>, key: SigningKey, network: Network): Promise<Tx> {
    const wallet = await Wallet.fromPrivateKey(key.privateKey, { addressPrefix: network.addressPrefix });

    wallet.connect(provider);
    return wallet.signTransaction(buildUnsignedGnoTx(draft.messages, draft.fee, draft.memo), decodeTxMessages);
  }

  async signTransaction(draft: TransactionDraft<GnoMessage>, key: SigningKey, network: Network): Promise<SignedTransaction> {
    const provider = await this.provider(network).catch((error) => {
      throw toNetworkError(error);
    });
    const chainId = await this.getChainId(network);

    if (chainId !== draft.chainId) {
      throw new AppError(AppErrorCode.NETWORK_MISMATCH, `Expected chain ${draft.chainId} but RPC reports ${chainId}`);
    }

    try {
      const signed = await this.signGnoTx(provider, draft, key, network);

      return { encoded: toBase64(Tx.encode(signed).finish()) };
    }
    catch (error) {
      throw toNetworkError(error);
    }
  }

  async broadcastTransaction(signed: SignedTransaction, network: Network): Promise<BroadcastResult> {
    const provider = await this.provider(network).catch((error) => {
      throw toNetworkError(error);
    });

    try {
      const result = await provider.sendTransaction(signed.encoded, TransactionEndpoint.BROADCAST_TX_COMMIT);

      return { hash: result.hash, height: result.height, data: result.deliver_tx.ResponseBase.Data ?? undefined };
    }
    catch (error) {
      throw new AppError(AppErrorCode.TRANSACTION_FAILED, (error as Error)?.message ?? 'Broadcast failed', { cause: error });
    }
  }
}
