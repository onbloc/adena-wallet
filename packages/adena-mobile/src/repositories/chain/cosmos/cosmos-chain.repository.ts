import { ripemd160, Secp256k1, sha256 } from '@cosmjs/crypto';
import { fromBase64, toBase64, toBech32, toHex } from '@cosmjs/encoding';

import { AppError, AppErrorCode } from '../../../core/errors';
import { TokenBalance } from '../../../domain/account';
import { COSMOS_FEE_POLICY, FeeEstimate } from '../../../domain/fee';
import { ChainFamily, Network } from '../../../domain/network';
import { BroadcastResult, MessageSummary, SignedTransaction, TransactionDraft } from '../../../domain/transaction';
import { CosmosAccountInfo, CosmosLcdClient } from '../../../infrastructure/http/cosmos-lcd.client';
import { isValidAddress } from '../../../utils/address';
import { formatTokenAmount, parseCoin } from '../../../utils/amount';
import { BigNumber } from '../../../utils/big-number';
import { ChainRepository, SigningKey, SimulationSigner } from '../chain-repository';
import { COSMOS_MSG_SEND_AMINO_TYPE, CosmosMessage } from './cosmos-messages';
import { encodeAuthInfo, encodeSignDoc, encodeTxBody, encodeTxRaw } from './cosmos-tx-encoder';

const ZERO_SIGNATURE = new Uint8Array(64);

const restUrlOf = (network: Network): string => {
  if (!network.restUrl) {
    throw new AppError(AppErrorCode.NETWORK_ERROR, `${network.networkName} has no REST endpoint`);
  }

  return network.restUrl;
};

interface CosmosFee {
  amount: { amount: string; denom: string }[];
  gas: string;
}

const toCosmosFee = (fee: { gasWanted: string; gasFee: string }): CosmosFee => {
  const coin = parseCoin(fee.gasFee);

  return { amount: coin ? [coin] : [], gas: fee.gasWanted };
};

const networkError = (error: unknown): AppError =>
  error instanceof AppError ? error : new AppError(AppErrorCode.NETWORK_ERROR, (error as Error)?.message, { cause: error });

// AtomOne (Cosmos SDK) signing over LCD REST with SIGN_MODE_DIRECT, like the extension's wallet sends.
export class CosmosChainRepository implements ChainRepository<CosmosMessage> {
  readonly family = ChainFamily.COSMOS;

  constructor(private readonly lcd: CosmosLcdClient) {}

  deriveAddress(publicKey: Uint8Array, network: Network): string {
    return toBech32(network.addressPrefix, ripemd160(sha256(publicKey)));
  }

  isValidAddress(address: string, network: Network): boolean {
    return isValidAddress(address, network.addressPrefix);
  }

  getChainId(network: Network): Promise<string> {
    return this.lcd.getNodeChainId(restUrlOf(network)).catch((error) => {
      throw networkError(error);
    });
  }

  async getNativeBalance(address: string, network: Network): Promise<TokenBalance> {
    const { denom, symbol, decimals } = network.nativeToken;
    const balances = await this.lcd.getBalances(restUrlOf(network), address).catch((error) => {
      throw networkError(error);
    });

    return { denom, symbol, decimals, amount: balances.find(coin => coin.denom === denom)?.amount ?? '0' };
  }

  // dApp requests for Cosmos chains are not supported over deep links yet.
  parseMessages(): CosmosMessage[] {
    throw new AppError(AppErrorCode.UNSUPPORTED_MESSAGE, 'Cosmos dApp requests are not supported');
  }

  describeMessages(messages: CosmosMessage[], network: Network): MessageSummary[] {
    return messages.map(message => ({
      title: 'Transfer',
      details: [
        { label: 'To', value: message.value.to_address },
        {
          label: 'Amount',
          value: message.value.amount.map((coin) => {
            const token = [network.nativeToken, network.feeToken].find(item => item.denom === coin.denom);

            return token ? `${formatTokenAmount(coin.amount, token.decimals)} ${token.symbol}` : `${coin.amount}${coin.denom}`;
          }).join(', '),
        },
      ],
    }));
  }

  private async resolveAccount(network: Network, address: string): Promise<CosmosAccountInfo> {
    return (await this.lcd.getAccount(restUrlOf(network), address)) ?? { accountNumber: '0', sequence: '0' };
  }

  async estimateFee(draft: TransactionDraft<CosmosMessage>, { publicKey }: SimulationSigner, network: Network): Promise<FeeEstimate> {
    const restUrl = restUrlOf(network);
    const feeDenom = network.feeToken.denom;
    const address = this.deriveAddress(publicKey, network);
    const { sequence } = await this.resolveAccount(network, address);
    // Simulation always declares DIRECT with a zero signature and the fallback fee as placeholder.
    const placeholder = { amount: [{ denom: feeDenom, amount: '0' }], gas: '200000' };
    const txBytes = encodeTxRaw(encodeTxBody(draft.messages, draft.memo), encodeAuthInfo(publicKey, sequence, placeholder), ZERO_SIGNATURE);

    let gasUsed: string;

    try {
      gasUsed = await this.lcd.simulate(restUrl, toBase64(txBytes));
    }
    catch (error) {
      throw new AppError(AppErrorCode.TRANSACTION_FAILED, (error as Error)?.message ?? 'Transaction simulation failed', { cause: error });
    }

    const prices = await this.lcd.getMinGasPrices(restUrl).catch(() => []);
    const gasPrice = prices.find(price => price.denom === feeDenom)?.amount ?? network.fallbackGasPrice;

    if (!gasPrice) {
      throw new AppError(AppErrorCode.NETWORK_ERROR, `No minimum gas price for ${feeDenom}`);
    }

    return { gasUsed, gasPrice: new BigNumber(gasPrice).toFixed(), denom: feeDenom, policy: COSMOS_FEE_POLICY };
  }

  async signTransaction(draft: TransactionDraft<CosmosMessage>, key: SigningKey, network: Network): Promise<SignedTransaction> {
    const chainId = await this.getChainId(network);

    if (chainId !== draft.chainId) {
      throw new AppError(AppErrorCode.NETWORK_MISMATCH, `Expected chain ${draft.chainId} but the node reports ${chainId}`);
    }

    if (draft.messages.some(message => message.type !== COSMOS_MSG_SEND_AMINO_TYPE)) {
      throw new AppError(AppErrorCode.UNSUPPORTED_MESSAGE, 'Only bank transfers are supported on this chain');
    }

    const { accountNumber, sequence } = await this.resolveAccount(network, this.deriveAddress(key.publicKey, network));
    const bodyBytes = encodeTxBody(draft.messages, draft.memo);
    const authInfoBytes = encodeAuthInfo(key.publicKey, sequence, toCosmosFee(draft.fee));
    const signBytes = encodeSignDoc(bodyBytes, authInfoBytes, draft.chainId, accountNumber);
    const signature = await Secp256k1.createSignature(sha256(signBytes), key.privateKey);
    const txBytes = encodeTxRaw(bodyBytes, authInfoBytes, new Uint8Array([...signature.r(32), ...signature.s(32)]));

    return { encoded: toBase64(txBytes) };
  }

  // BROADCAST_MODE_SYNC: success means the tx passed CheckTx, as in the extension.
  async broadcastTransaction(signed: SignedTransaction, network: Network): Promise<BroadcastResult> {
    try {
      const result = await this.lcd.broadcastSync(restUrlOf(network), signed.encoded);

      return { hash: result.txhash || toHex(sha256(fromBase64(signed.encoded))).toUpperCase(), height: result.height };
    }
    catch (error) {
      throw error instanceof AppError ? error : new AppError(AppErrorCode.TRANSACTION_FAILED, (error as Error)?.message, { cause: error });
    }
  }
}
