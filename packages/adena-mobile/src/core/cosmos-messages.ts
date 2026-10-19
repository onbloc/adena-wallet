import type {StdSignDoc} from '@cosmjs/amino';
import {GenericAuthorization} from 'cosmjs-types/cosmos/authz/v1beta1/authz';
import {
  MsgExec,
  MsgGrant,
  MsgRevoke,
} from 'cosmjs-types/cosmos/authz/v1beta1/tx';
import {MsgSend} from 'cosmjs-types/cosmos/bank/v1beta1/tx';
import {
  MsgSetWithdrawAddress,
  MsgWithdrawDelegatorReward,
} from 'cosmjs-types/cosmos/distribution/v1beta1/tx';
import {MsgGrantAllowance} from 'cosmjs-types/cosmos/feegrant/v1beta1/tx';
import {MsgVote as MsgVoteV1} from 'cosmjs-types/cosmos/gov/v1/tx';
import {MsgVote} from 'cosmjs-types/cosmos/gov/v1beta1/tx';
import {
  MsgBeginRedelegate,
  MsgDelegate,
  MsgUndelegate,
} from 'cosmjs-types/cosmos/staking/v1beta1/tx';
import {AuthInfo, TxBody} from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import {MsgTransfer} from 'cosmjs-types/ibc/applications/transfer/v1/tx';

/**
 * Readable Cosmos sign requests. The extension shows only the raw document;
 * on mobile each message is decoded (amino JSON or DIRECT protobuf) into
 * rows, and the request is graded so authz, fee grants and unknown messages
 * need the same acknowledgement as high-risk Gno requests.
 */

export interface Coin {
  denom: string;
  amount: string;
}

export interface CosmosMessageView {
  /** The amino type or protobuf type URL as the request carries it. */
  type: string;
  /** Null for a message Adena cannot read. */
  title: string | null;
  rows: {label: string; value: string}[];
}

export interface CosmosSignSummary {
  messages: CosmosMessageView[];
  fee: Coin[];
  memo: string;
}

export type CosmosRiskCode =
  | 'NO_MESSAGES'
  | 'UNKNOWN_MESSAGE'
  | 'AUTHZ_GRANT'
  | 'AUTHZ_EXEC'
  | 'FEE_GRANT'
  | 'WITHDRAW_ADDRESS'
  | 'HIGH_FEE';

export interface CosmosRisk {
  level: 'low' | 'medium' | 'high';
  codes: CosmosRiskCode[];
}

type Kind =
  | 'send'
  | 'delegate'
  | 'undelegate'
  | 'redelegate'
  | 'withdrawRewards'
  | 'withdrawAddress'
  | 'vote'
  | 'grant'
  | 'exec'
  | 'revoke'
  | 'feeGrant'
  | 'ibcTransfer';

interface KindSpec {
  title: string;
  risk?: CosmosRiskCode;
  /** Decodes the DIRECT `Any.value` into the amino-like shape `rows` reads. */
  decode: (bytes: Uint8Array) => unknown;
  rows: (value: Record<string, any>) => [string, unknown][];
}

const coinList = (value: unknown): string =>
  Array.isArray(value) && value.length > 0
    ? value.map(coin => formatCoin(coin as Coin)).join(', ')
    : 'None';

const pick = (value: Record<string, any>, snake: string, camel: string) =>
  value[snake] ?? value[camel];

const VOTE_OPTIONS: Record<string, string> = {
  '1': 'Yes',
  '2': 'Abstain',
  '3': 'No',
  '4': 'No with veto',
  VOTE_OPTION_YES: 'Yes',
  VOTE_OPTION_ABSTAIN: 'Abstain',
  VOTE_OPTION_NO: 'No',
  VOTE_OPTION_NO_WITH_VETO: 'No with veto',
};

const KINDS: Record<Kind, KindSpec> = {
  send: {
    title: 'Send',
    decode: bytes => MsgSend.decode(bytes),
    rows: v => [
      ['From', pick(v, 'from_address', 'fromAddress')],
      ['To', pick(v, 'to_address', 'toAddress')],
      ['Amount', coinList(v.amount)],
    ],
  },
  delegate: {
    title: 'Delegate',
    decode: bytes => MsgDelegate.decode(bytes),
    rows: v => [
      ['Validator', pick(v, 'validator_address', 'validatorAddress')],
      ['Amount', coinList(v.amount ? [v.amount] : [])],
    ],
  },
  undelegate: {
    title: 'Undelegate',
    decode: bytes => MsgUndelegate.decode(bytes),
    rows: v => [
      ['Validator', pick(v, 'validator_address', 'validatorAddress')],
      ['Amount', coinList(v.amount ? [v.amount] : [])],
    ],
  },
  redelegate: {
    title: 'Redelegate',
    decode: bytes => MsgBeginRedelegate.decode(bytes),
    rows: v => [
      [
        'From validator',
        pick(v, 'validator_src_address', 'validatorSrcAddress'),
      ],
      ['To validator', pick(v, 'validator_dst_address', 'validatorDstAddress')],
      ['Amount', coinList(v.amount ? [v.amount] : [])],
    ],
  },
  withdrawRewards: {
    title: 'Claim staking rewards',
    decode: bytes => MsgWithdrawDelegatorReward.decode(bytes),
    rows: v => [
      ['Validator', pick(v, 'validator_address', 'validatorAddress')],
    ],
  },
  withdrawAddress: {
    title: 'Change rewards address',
    risk: 'WITHDRAW_ADDRESS',
    decode: bytes => MsgSetWithdrawAddress.decode(bytes),
    rows: v => [
      ['New address', pick(v, 'withdraw_address', 'withdrawAddress')],
    ],
  },
  vote: {
    title: 'Vote',
    decode: bytes => MsgVote.decode(bytes),
    rows: v => [
      ['Proposal', pick(v, 'proposal_id', 'proposalId')],
      ['Option', VOTE_OPTIONS[String(v.option)] ?? v.option],
    ],
  },
  grant: {
    title: 'Grant permission (authz)',
    risk: 'AUTHZ_GRANT',
    decode: bytes => {
      const grant = MsgGrant.decode(bytes);
      const authorization = grant.grant?.authorization;
      // Read the allowed message of a generic grant, as amino JSON carries it.
      const msg =
        authorization?.typeUrl === '/cosmos.authz.v1beta1.GenericAuthorization'
          ? GenericAuthorization.decode(authorization.value).msg
          : undefined;
      return {
        ...grant,
        grant: {
          ...grant.grant,
          authorization: {typeUrl: authorization?.typeUrl, value: {msg}},
        },
      };
    },
    rows: v => {
      const authorization = v.grant?.authorization ?? {};
      return [
        ['Grantee', v.grantee],
        [
          'Permission',
          authorization.type ?? authorization.typeUrl ?? 'Unknown',
        ],
        ['Allowed message', authorization.value?.msg],
        ['Expires', formatExpiration(v.grant?.expiration)],
      ];
    },
  },
  exec: {
    title: 'Execute as grantee (authz)',
    risk: 'AUTHZ_EXEC',
    decode: bytes => MsgExec.decode(bytes),
    rows: v => [
      ['Grantee', v.grantee],
      [
        'Messages',
        (v.msgs ?? [])
          .map((msg: any) => msg?.type ?? msg?.typeUrl ?? '?')
          .join(', '),
      ],
    ],
  },
  revoke: {
    title: 'Revoke permission (authz)',
    decode: bytes => MsgRevoke.decode(bytes),
    rows: v => [
      ['Grantee', v.grantee],
      ['Message', pick(v, 'msg_type_url', 'msgTypeUrl')],
    ],
  },
  feeGrant: {
    title: 'Pay fees for another account',
    risk: 'FEE_GRANT',
    decode: bytes => MsgGrantAllowance.decode(bytes),
    rows: v => [
      ['Grantee', v.grantee],
      ['Allowance', v.allowance?.type ?? v.allowance?.typeUrl ?? 'Unknown'],
    ],
  },
  ibcTransfer: {
    title: 'IBC transfer',
    decode: bytes => MsgTransfer.decode(bytes),
    rows: v => [
      ['To', v.receiver],
      ['Amount', coinList(v.token ? [v.token] : [])],
      ['Channel', pick(v, 'source_channel', 'sourceChannel')],
    ],
  },
};

// Amino types follow @cosmjs/stargate's AminoTypes.
const BY_TYPE: Record<string, Kind> = {
  'cosmos-sdk/MsgSend': 'send',
  '/cosmos.bank.v1beta1.MsgSend': 'send',
  'cosmos-sdk/MsgDelegate': 'delegate',
  '/cosmos.staking.v1beta1.MsgDelegate': 'delegate',
  'cosmos-sdk/MsgUndelegate': 'undelegate',
  '/cosmos.staking.v1beta1.MsgUndelegate': 'undelegate',
  'cosmos-sdk/MsgBeginRedelegate': 'redelegate',
  '/cosmos.staking.v1beta1.MsgBeginRedelegate': 'redelegate',
  'cosmos-sdk/MsgWithdrawDelegationReward': 'withdrawRewards',
  '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward': 'withdrawRewards',
  'cosmos-sdk/MsgModifyWithdrawAddress': 'withdrawAddress',
  '/cosmos.distribution.v1beta1.MsgSetWithdrawAddress': 'withdrawAddress',
  'cosmos-sdk/MsgVote': 'vote',
  '/cosmos.gov.v1beta1.MsgVote': 'vote',
  'cosmos-sdk/v1/MsgVote': 'vote',
  '/cosmos.gov.v1.MsgVote': 'vote',
  'cosmos-sdk/MsgGrant': 'grant',
  '/cosmos.authz.v1beta1.MsgGrant': 'grant',
  'cosmos-sdk/MsgExec': 'exec',
  '/cosmos.authz.v1beta1.MsgExec': 'exec',
  'cosmos-sdk/MsgRevoke': 'revoke',
  '/cosmos.authz.v1beta1.MsgRevoke': 'revoke',
  'cosmos-sdk/MsgGrantAllowance': 'feeGrant',
  '/cosmos.feegrant.v1beta1.MsgGrantAllowance': 'feeGrant',
  'cosmos-sdk/MsgTransfer': 'ibcTransfer',
  '/ibc.applications.transfer.v1.MsgTransfer': 'ibcTransfer',
};

// gov v1 MsgVote has its own protobuf layout.
const DIRECT_DECODERS: Record<string, (bytes: Uint8Array) => unknown> = {
  '/cosmos.gov.v1.MsgVote': bytes => MsgVoteV1.decode(bytes),
};

/** "5 ATONE (5000000 uatone)" for micro denoms, else the raw amount. */
export function formatCoin(coin: Coin): string {
  const raw = `${coin.amount} ${coin.denom}`;
  const micro = /^u([a-z]+)$/.exec(coin.denom);
  if (!micro || !/^\d+$/.test(coin.amount)) {
    return raw;
  }
  const digits = coin.amount.padStart(7, '0');
  const whole = digits.slice(0, -6).replace(/^0+(?=\d)/, '');
  const fraction = digits.slice(-6).replace(/0+$/, '');
  const amount = fraction ? `${whole}.${fraction}` : whole;
  return `${amount} ${micro[1].toUpperCase()} (${raw})`;
}

function formatExpiration(value: unknown): string {
  if (!value) {
    return 'Never';
  }
  if (typeof value === 'string') {
    return value;
  }
  const seconds = (value as {seconds?: bigint | number}).seconds;
  return seconds === undefined
    ? 'Unknown'
    : new Date(Number(seconds) * 1000).toISOString();
}

function view(type: string, value: unknown): CosmosMessageView {
  const kind = BY_TYPE[type];
  if (!kind || !value || typeof value !== 'object') {
    return {type, title: null, rows: []};
  }
  const spec = KINDS[kind];
  const rows = spec
    .rows(value as Record<string, any>)
    .filter(([, cell]) => cell !== undefined && cell !== null && cell !== '')
    .map(([label, cell]) => ({label, value: String(cell)}));
  return {type, title: spec.title, rows};
}

export function summarizeAminoSignDoc(doc: StdSignDoc): CosmosSignSummary {
  return {
    messages: (doc.msgs ?? []).map(msg => view(msg.type, msg.value)),
    fee: (doc.fee?.amount ?? []) as Coin[],
    memo: doc.memo ?? '',
  };
}

export function summarizeDirectSignDoc(doc: {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
}): CosmosSignSummary {
  const body = TxBody.decode(doc.bodyBytes);
  const authInfo = AuthInfo.decode(doc.authInfoBytes);
  return {
    messages: body.messages.map(any => {
      const kind = BY_TYPE[any.typeUrl];
      const decode =
        DIRECT_DECODERS[any.typeUrl] ?? (kind && KINDS[kind].decode);
      let value: unknown = null;
      try {
        value = decode ? decode(any.value) : null;
      } catch {
        value = null;
      }
      return view(any.typeUrl, value);
    }),
    fee: (authInfo.fee?.amount ?? []) as Coin[],
    memo: body.memo,
  };
}

// One whole token of a micro denom, far above usual AtomOne fees.
const HIGH_FEE_MICRO = 1_000_000n;

export function classifyCosmosSigningRisk(
  summary: CosmosSignSummary,
): CosmosRisk {
  const codes = new Set<CosmosRiskCode>();
  let medium = false;
  if (summary.messages.length === 0) {
    codes.add('NO_MESSAGES');
  }
  for (const message of summary.messages) {
    const kind = BY_TYPE[message.type];
    if (!message.title || !kind) {
      codes.add('UNKNOWN_MESSAGE');
      continue;
    }
    const risk = KINDS[kind].risk;
    if (risk) {
      codes.add(risk);
    }
  }
  const highFee = summary.fee.some(
    coin =>
      /^u[a-z]+$/.test(coin.denom) &&
      /^\d+$/.test(coin.amount) &&
      BigInt(coin.amount) >= HIGH_FEE_MICRO,
  );
  if (highFee) {
    codes.add('HIGH_FEE');
    medium = true;
  }
  const high = [...codes].some(code => code !== 'HIGH_FEE');
  return {
    level: high ? 'high' : medium ? 'medium' : 'low',
    codes: [...codes],
  };
}

export const COSMOS_RISK_MESSAGES: Record<CosmosRiskCode, string> = {
  NO_MESSAGES: 'The request contains no messages.',
  UNKNOWN_MESSAGE:
    'The request contains a message Adena cannot display. Do not sign it unless you know exactly what it does.',
  AUTHZ_GRANT:
    'This lets another address act for your account. It can move your assets until the permission expires or is revoked.',
  AUTHZ_EXEC:
    'This executes messages under a permission another account gave you.',
  FEE_GRANT: 'This lets another address spend your tokens on its fees.',
  WITHDRAW_ADDRESS:
    'This sends your future staking rewards to another address.',
  HIGH_FEE: 'The network fee is unusually high.',
};
