import { Secp256k1 } from '@cosmjs/crypto';

import { toErrorMessage } from '../core/error-message';
import { AppError, AppErrorCode, TransactionPendingError } from '../core/errors';
import { computeFee, DEFAULT_FEE_SELECTION } from '../domain/fee';
import { Network } from '../domain/network';
import { effectiveSpendUsed } from '../domain/session-card';
import { isTaskPending, SessionTask, SessionTaskStatus } from '../domain/session-task';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { StorageSessionTaskRepository } from '../repositories/session-task.repository';
import { addAmount, compareAmount, parseCoin, subtractAmount } from '../utils/amount';
import { createId } from '../utils/id';

export interface ScheduleSendInput {
  network: Network;
  accountId: string;
  masterAddress: string;
  sessionAddress: string;
  toAddress: string;
  amount: string;
  delaySeconds: number;
}

type Listener = () => void;

// Shared by every container in this JS runtime (the Android inject sheet builds its own), so one
// container never reports another's live task as missed.
const runtimeTimers = new Map<string, { timer: ReturnType<typeof setTimeout>; key: Uint8Array }>();

// Runs card actions after a delay, signed by the card's own key. The key is held in memory only until
// the task runs, so neither the wallet password nor biometrics are needed then, even while locked.
// JS timers only run while the app process is alive; a task cut short by a restart is reported as missed.
export class SessionTaskService {
  private readonly listeners = new Set<Listener>();
  private readonly timers = runtimeTimers;

  constructor(
    private readonly chainRegistry: ChainRegistry,
    private readonly repository: StorageSessionTaskRepository,
    private readonly now: () => number = Date.now,
  ) {
    // Tasks left pending by a previous run lost their in-memory key.
    this.repository.list()
      .filter(task => isTaskPending(task) && !this.timers.has(task.id))
      .forEach(task => this.repository.save({ ...task, status: SessionTaskStatus.MISSED }));
  }

  list(sessionAddress?: string): SessionTask[] {
    const tasks = this.repository.list();

    return sessionAddress ? tasks.filter(task => task.sessionAddress === sessionAddress) : tasks;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  }

  // Takes ownership of `privateKey` and wipes it once the task has run or is cancelled.
  scheduleSend(input: ScheduleSendInput, privateKey: Uint8Array): SessionTask {
    const task: SessionTask = {
      id: createId(),
      sessionAddress: input.sessionAddress,
      masterAddress: input.masterAddress,
      accountId: input.accountId,
      networkId: input.network.id,
      toAddress: input.toAddress,
      amount: input.amount,
      runAt: this.now() + input.delaySeconds * 1000,
      createdAt: this.now(),
      status: SessionTaskStatus.SCHEDULED,
    };
    const key = Uint8Array.from(privateKey);

    privateKey.fill(0);
    this.update(task);
    this.timers.set(task.id, {
      key,
      timer: setTimeout(() => {
        void this.run(task, input.network);
      }, input.delaySeconds * 1000),
    });

    return task;
  }

  cancel(taskId: string): void {
    const entry = this.timers.get(taskId);
    const task = this.repository.list().find(item => item.id === taskId);

    if (entry) {
      clearTimeout(entry.timer);
      entry.key.fill(0);
      this.timers.delete(taskId);
    }

    if (task && isTaskPending(task)) {
      this.update({ ...task, status: SessionTaskStatus.FAILED, error: 'Cancelled' });
    }
  }

  // Cards that are revoked can no longer sign; their pending tasks are dropped with them.
  cancelForSession(sessionAddress: string): void {
    this.list(sessionAddress).filter(isTaskPending).forEach(task => this.cancel(task.id));
  }

  private update(task: SessionTask): void {
    this.repository.save(task);
    this.listeners.forEach(listener => listener());
  }

  private async run(task: SessionTask, network: Network): Promise<void> {
    const entry = this.timers.get(task.id);

    this.timers.delete(task.id);

    if (!entry) {
      return;
    }

    const { key } = entry;

    this.update({ ...task, status: SessionTaskStatus.RUNNING });

    try {
      const txHash = await this.send(task, network, key);

      this.update({ ...task, status: SessionTaskStatus.SENT, txHash });
    }
    catch (error) {
      this.update(error instanceof TransactionPendingError
        ? { ...task, status: SessionTaskStatus.UNCONFIRMED, txHash: error.hash }
        : { ...task, status: SessionTaskStatus.FAILED, error: toErrorMessage(error) });
    }
    finally {
      key.fill(0);
    }
  }

  private async send(task: SessionTask, network: Network, privateKey: Uint8Array): Promise<string> {
    const sessions = this.chainRegistry.sessions(network);
    const chain = this.chainRegistry.forNetwork(network);

    if (!sessions) {
      throw new AppError(AppErrorCode.UNSUPPORTED_NETWORK, 'Cards are not available on this network');
    }

    const session = await sessions.findSession(task.masterAddress, task.sessionAddress, network);

    if (!session) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'The card no longer exists');
    }

    const publicKey = Secp256k1.compressPubkey((await Secp256k1.makeKeypair(privateKey)).pubkey);
    const draft = {
      networkId: network.id,
      chainId: network.chainId,
      messages: sessions.buildSendMessages(task.masterAddress, task.toAddress, task.amount, network),
      fee: { gasWanted: '0', gasFee: '' },
      memo: '',
    };
    const estimate = await chain.estimateFee(draft, { publicKey, sessionAddress: session.address }, network);
    const { gasWanted, gasFee } = computeFee(estimate, DEFAULT_FEE_SELECTION);
    const cost = addAmount(task.amount, parseCoin(gasFee)?.amount ?? '0');
    const left = subtractAmount(session.spendLimit, effectiveSpendUsed(session, Math.floor(this.now() / 1000)));

    // The chain enforces this too; checking first keeps a doomed tx from being broadcast.
    if (compareAmount(cost, left) > 0) {
      throw new AppError(AppErrorCode.INSUFFICIENT_BALANCE, 'The card limit does not cover this send and its fee');
    }

    const signed = await chain.signTransaction({ ...draft, fee: { gasWanted, gasFee } }, { privateKey, publicKey }, network, undefined, {
      address: session.address,
      accountNumber: session.accountNumber,
      sequence: session.sequence,
    });

    return (await chain.broadcastTransaction(signed, network)).hash;
  }
}
