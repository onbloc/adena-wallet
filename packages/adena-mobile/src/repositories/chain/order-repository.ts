import { Network } from '../../domain/network';
import { DcaRules, LimitRules, Order } from '../../domain/order';
import { SwapApproveRoute } from '../../domain/swap';
import { DexOrderConfig, DexSwapConfig } from '../../resources';

export interface OrderInputToken {
  native: boolean;
  // Registry key the order realms trade (wugnot's for the native coin).
  path: string;
  approveRoute: SwapApproveRoute | null;
}

interface OrderMessageBase {
  network: Network;
  caller: string;
  swap: DexSwapConfig;
  orders: DexOrderConfig;
  input: OrderInputToken;
  outputPath: string;
  // Address of the order realm that takes custody; it is the approve spender.
  spender: string;
}

export interface CreateDcaRequest extends OrderMessageBase {
  interval: number;
  slotOffset: number;
  amountPerExecution: string;
  executionCount: number;
}

export interface CreateLimitRequest extends OrderMessageBase {
  makingAmount: string;
  takingAmount: string;
  slippageBps: number;
  expiresAt: number;
}

// GnoSwap order protocol access for one chain family: rules, the owner's orders and order messages.
export interface OrderRepository {
  getRealmAddress(network: Network, realmPath: string): Promise<string>;
  getDcaRules(network: Network, config: DexOrderConfig, inputPath: string, outputPath: string): Promise<DcaRules>;
  getLimitRules(network: Network, config: DexOrderConfig, inputPath: string, outputPath: string): Promise<LimitRules>;
  // Pending orders only; settled ones are removed by the realms.
  listOrders(network: Network, config: DexOrderConfig, owner: string): Promise<Order[]>;
  buildCreateDcaMessages(request: CreateDcaRequest): unknown[];
  buildCreateLimitMessages(request: CreateLimitRequest): unknown[];
  buildClaimMessages(caller: string, config: DexOrderConfig, order: Order): unknown[];
  buildCancelMessages(caller: string, config: DexOrderConfig, order: Order): unknown[];
}
