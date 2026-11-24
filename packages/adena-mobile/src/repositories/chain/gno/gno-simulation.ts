import { Any } from '@gnolang/gno-js-client';
import {
  constructRequestError,
  extractSimulateFromResponse,
  Tx,
} from '@gnolang/tm2-js-client';

import { parseCoin } from '../../../utils/amount';
import { BigNumber } from '../../../utils/big-number';
import { GnoMessage, GnoMessageType } from './gno-messages';
import { GnoProvider } from './gno-provider';

export interface GnoSimulation {
  gasUsed: bigint;
  // Net storage deposit in the native denom's smallest unit.
  storageDeposit: string;
}

const STORAGE_DEPOSIT_EVENT = '/tm.StorageDepositEvent';
const STORAGE_UNLOCK_EVENT = '/tm.StorageUnlockEvent';

const readVarint = (bytes: Uint8Array, start: number): [number, number] => {
  let value = 0;
  let shift = 0;
  let pos = start;

  while (pos < bytes.length) {
    const byte = bytes[pos++];

    value += (byte & 0x7f) * 2 ** shift;

    if ((byte & 0x80) === 0) {
      return [value, pos];
    }

    shift += 7;
  }

  throw new Error('truncated varint');
};

// Field 2 of both events is the coin string (fee_delta / fee_refund); other fields are skipped.
export const readEventFee = (bytes: Uint8Array): string => {
  let pos = 0;
  let fee = '';

  while (pos < bytes.length) {
    const [tag, afterTag] = readVarint(bytes, pos);
    const field = Math.floor(tag / 8);
    const wireType = tag % 8;

    if (wireType === 0) {
      pos = readVarint(bytes, afterTag)[1];
    }
    else if (wireType === 2) {
      const [length, start] = readVarint(bytes, afterTag);

      if (field === 2) {
        fee = new TextDecoder().decode(bytes.subarray(start, start + length));
      }

      pos = start + length;
    }
    else {
      break;
    }
  }

  return fee;
};

const coinAmount = (coin: string, denom: string): BigNumber => {
  const parsed = parseCoin(coin);

  return parsed && parsed.denom === denom ? new BigNumber(parsed.amount) : new BigNumber(0);
};

export const netStorageDeposit = (events: Any[], denom: string): string => {
  let net = new BigNumber(0);

  for (const event of events) {
    if (event.type_url === STORAGE_DEPOSIT_EVENT) {
      net = net.plus(coinAmount(readEventFee(event.value), denom));
    }
    else if (event.type_url === STORAGE_UNLOCK_EVENT) {
      net = net.minus(coinAmount(readEventFee(event.value), denom));
    }
  }

  return BigNumber.max(net, 0).toFixed(0);
};

// tm2-js-client 3.3.0 `estimateGas` sends the base64 text of the tx instead of its bytes, so
// every node answers "unable to decode tx". This is the extension's `simulateTx` query.
// Known tm2 errors keep their message; anything else (VM panics, realm errors) surfaces the
// node's own reason, like the extension's `${typeUrl}: ${first log line}`.
export const toSimulationError = (typeUrl: string, log: string): Error => {
  const known = constructRequestError(typeUrl, log);

  if (!known.message.startsWith('unknown error')) {
    return known;
  }

  const panic = /VM panic: (.+)/.exec(log) ?? /^panic: (.+)$/m.exec(log) ?? /recovered: ([^\n]+)/.exec(log);
  const firstLine = log.split('\n').map(line => line.trim()).find(line => line && !line.startsWith('--=') && !line.startsWith('msg:'));
  const error = new Error(panic?.[1]?.trim() ?? firstLine ?? typeUrl);

  (error as Error & { log?: string }).log = log;
  return error;
};

export const simulateGnoTx = async (provider: GnoProvider, tx: Tx, denom: string): Promise<GnoSimulation> => {
  const response = await provider.abciQuery({ path: '.app/simulate', data: Tx.encode(tx).finish(), height: 0, prove: false });
  const result = extractSimulateFromResponse(response);
  const errorType = result.response_base?.error?.type_url;

  if (errorType) {
    throw toSimulationError(errorType, result.response_base?.log ?? '');
  }

  return {
    gasUsed: BigInt(result.gas_used),
    storageDeposit: netStorageDeposit(result.response_base?.events ?? [], denom),
  };
};

// Since gnolang/gno#6088 the node verifies signatures when simulating messages that carry code.
export const requiresSignedSimulation = (messages: GnoMessage[]): boolean =>
  messages.some(message => message.type === GnoMessageType.VM_RUN || message.type === GnoMessageType.VM_ADDPKG);

// Extension's static table for when no key is available to sign the simulation.
const STATIC_GAS_USED = { ADD_PACKAGE: 1_000_000_000n, MSG_RUN: 1_000_000_000n, MSG_RUN_GRC20_TRANSFER: 50_000_000n };
const GRC20_TRANSFER_MARKER = '.Transfer(';

export const staticCodeGasUsed = (messages: GnoMessage[]): bigint =>
  messages.reduce((total, message) => {
    if (message.type === GnoMessageType.VM_ADDPKG) {
      return total + STATIC_GAS_USED.ADD_PACKAGE;
    }

    if (message.type === GnoMessageType.VM_RUN) {
      const isGrc20Transfer = message.value.package.files.some(file => file.body.includes('grc20reg') && file.body.includes(GRC20_TRANSFER_MARKER));

      return total + (isGrc20Transfer ? STATIC_GAS_USED.MSG_RUN_GRC20_TRANSFER : STATIC_GAS_USED.MSG_RUN);
    }

    return total;
  }, 0n);
