import { AppError, AppErrorCode } from '../../../core/errors';
import { GnoMemPackage, GnoMessage, GnoMessageType } from './gno-messages';

const MAX_MESSAGES = 16;
const MAX_ARGS = 64;
const MAX_FILES = 64;
// tm2 std.ParseCoin: int64 amount, optional spaces, denom up to 274 bytes.
const COIN_PATTERN = /^(\d+)\s*([a-z/][a-z0-9_.:/-]{2,})$/;
const MAX_DENOM_LENGTH = 274;
const MAX_COIN_AMOUNT = 9223372036854775807n;

type RawRecord = Record<string, unknown>;

const fail = (message: string): never => {
  throw new AppError(AppErrorCode.INVALID_REQUEST, message);
};

const asRecord = (value: unknown, field: string): RawRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as RawRecord) : fail(`${field} must be an object`);

const asString = (value: unknown, field: string, { optional = false } = {}): string => {
  if (value === undefined || value === null) {
    return optional ? '' : fail(`${field} is required`);
  }

  return typeof value === 'string' ? value : fail(`${field} must be a string`);
};

// Re-emits the list as tm2 Coins.String() does (denom-sorted, normalized amounts): the node
// signs its decoded form, so any other spelling of the same coins fails signature checks.
const asCoins = (value: unknown, field: string): string => {
  const coins = asString(value, field, { optional: true }).trim();

  if (!coins) {
    return '';
  }

  const invalid = (): never => fail(`${field} must be a coin list such as 1000ugnot`);
  const parsed = coins.split(',').map((coin) => {
    const match = COIN_PATTERN.exec(coin.trim()) ?? invalid();
    const amount = BigInt(match[1]);

    if (amount <= 0n || amount > MAX_COIN_AMOUNT || match[2].length > MAX_DENOM_LENGTH) {
      invalid();
    }

    return { amount, denom: match[2] };
  });

  parsed.sort((a, b) => (a.denom < b.denom ? -1 : a.denom > b.denom ? 1 : 0));

  if (parsed.some((coin, index) => index > 0 && coin.denom === parsed[index - 1].denom)) {
    fail(`${field} must not repeat a denomination`);
  }

  return parsed.map(coin => `${coin.amount.toString()}${coin.denom}`).join(',');
};

const asSigner = (value: unknown, field: string, signerAddress: string): string => {
  const address = asString(value, field);

  if (address !== signerAddress) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, `${field} does not match the selected account`);
  }

  return address;
};

const asPackage = (value: unknown): GnoMemPackage => {
  const record = asRecord(value, 'package');
  const files = Array.isArray(record.files) ? record.files : fail('package.files must be an array');

  if (files.length === 0 || files.length > MAX_FILES) {
    fail('package.files has an invalid length');
  }

  return {
    name: asString(record.name, 'package.name'),
    path: asString(record.path, 'package.path'),
    files: files.map((file, index) => {
      const entry = asRecord(file, `package.files[${index}]`);

      return {
        name: asString(entry.name, `package.files[${index}].name`),
        body: asString(entry.body, `package.files[${index}].body`),
      };
    }),
  };
};

const parseMessage = (raw: unknown, signerAddress: string): GnoMessage => {
  const message = asRecord(raw, 'message');
  const value = asRecord(message.value, 'message.value');

  switch (message.type) {
    case GnoMessageType.BANK_MSG_SEND:
      return {
        type: GnoMessageType.BANK_MSG_SEND,
        value: {
          from_address: asSigner(value.from_address, 'from_address', signerAddress),
          to_address: asString(value.to_address, 'to_address'),
          amount: asCoins(value.amount, 'amount') || fail('amount is required'),
        },
      };
    case GnoMessageType.VM_CALL: {
      const args = value.args === undefined || value.args === null ? null : value.args;

      if (args !== null && (!Array.isArray(args) || args.length > MAX_ARGS)) {
        fail('args must be an array of strings');
      }

      return {
        type: GnoMessageType.VM_CALL,
        value: {
          caller: asSigner(value.caller, 'caller', signerAddress),
          send: asCoins(value.send, 'send'),
          max_deposit: asCoins(value.max_deposit, 'max_deposit'),
          pkg_path: asString(value.pkg_path, 'pkg_path'),
          func: asString(value.func, 'func'),
          args: args ? (args as unknown[]).map((arg, index) => asString(arg, `args[${index}]`)) : null,
        },
      };
    }

    case GnoMessageType.VM_ADDPKG:
      return {
        type: GnoMessageType.VM_ADDPKG,
        value: {
          creator: asSigner(value.creator, 'creator', signerAddress),
          send: asCoins(value.send, 'send'),
          max_deposit: asCoins(value.max_deposit, 'max_deposit'),
          package: asPackage(value.package),
        },
      };
    case GnoMessageType.VM_RUN:
      return {
        type: GnoMessageType.VM_RUN,
        value: {
          caller: asSigner(value.caller, 'caller', signerAddress),
          send: asCoins(value.send, 'send'),
          max_deposit: asCoins(value.max_deposit, 'max_deposit'),
          package: asPackage(value.package),
        },
      };
    default:
      // Session and package-governance messages grant authority and are not accepted over deep links.
      throw new AppError(AppErrorCode.UNSUPPORTED_MESSAGE, `Unsupported message type: ${String(message.type)}`);
  }
};

export const parseGnoMessages = (raw: unknown[], signerAddress: string): GnoMessage[] => {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) {
    fail('messages must be a non-empty array');
  }

  return raw.map(message => parseMessage(message, signerAddress));
};
