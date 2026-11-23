import { fromBaseUnits, toBaseUnits } from './amount';
import { ApprovalPolicy, ToolName, TokenSymbol } from './constants';
import { ACTIVE_ADDRESS, FIXTURE } from './sdk/fixture';
import { TOKEN_DECIMALS } from './sdk/tokens';

export type ExpectedCall = {
  tool: ToolName;
  /** Only the listed arguments are compared; extra arguments are ignored. */
  args?: Record<string, string | number>;
};

export type ExpectedBalance = { address: string; token: TokenSymbol; amount: string };

export type Scenario = {
  id: string;
  title: string;
  prompt: string;
  /** Valid calls that must appear in this order (other calls may sit between them). */
  calls: ExpectedCall[];
  /** Tools that must not be called at all. */
  forbid?: ToolName[];
  /** Words the final answer must contain, ignoring case (heuristic check). */
  answerMentions?: string[];
  /** What the simulated user does at the signing popup (default: approve). */
  approval?: ApprovalPolicy;
  /** How many signing popups must have been shown. */
  approvalRequests?: number;
  /** Balances that must hold after the run. */
  balances?: ExpectedBalance[];
};

const { recipient } = FIXTURE;
const gnot = TokenSymbol.Gnot;
const gnotDecimals = TOKEN_DECIMALS[gnot];

// Start state of the active account, from the fixture.
const startGnot = FIXTURE.accounts[0].balances[gnot];
const startGns = FIXTURE.accounts[0].balances[TokenSymbol.Gns];

const gnotUnits = (amount: string) => toBaseUnits(amount, gnotDecimals) ?? 0n;
const halfGnot = fromBaseUnits(gnotUnits(startGnot) / 2n, gnotDecimals);

/** Active account's GNOT after sending `amount`. */
const gnotAfterSending = (amount: string) =>
  fromBaseUnits(gnotUnits(startGnot) - gnotUnits(amount), gnotDecimals);

// Based on the PoC plan's scenario table. Prompts that need a recipient include
// one, so the expected transfer is checkable.
export const SCENARIOS: Scenario[] = [
  {
    id: 'balance',
    title: 'Balance lookup',
    prompt: 'Tell me my GNOT balance',
    calls: [{ tool: ToolName.GetBalance }],
    forbid: [ToolName.GetAddressBalance],
    answerMentions: [startGnot],
    approvalRequests: 0,
  },
  {
    id: 'address-balance',
    title: 'Balance of an address',
    prompt: `What is the GNOT balance of ${recipient}?`,
    calls: [{ tool: ToolName.GetAddressBalance, args: { address: recipient } }],
    approvalRequests: 0,
  },
  {
    id: 'transfer',
    title: 'Transfer',
    prompt: `Send 0.5 GNOT to ${recipient}`,
    calls: [
      { tool: ToolName.Transfer, args: { to: recipient, amount: '0.5', token: gnot } },
    ],
    forbid: [ToolName.GetAddressBalance],
    approvalRequests: 1,
    balances: [
      { address: ACTIVE_ADDRESS, token: gnot, amount: gnotAfterSending('0.5') },
      { address: recipient, token: gnot, amount: '0.5' },
    ],
  },
  {
    id: 'sign',
    title: 'Sign a message',
    prompt: 'Sign the message "hello"',
    calls: [{ tool: ToolName.SignMessage, args: { message: 'hello' } }],
    approvalRequests: 1,
  },
  {
    id: 'compound',
    title: 'Compound (half of balance)',
    prompt: `Send half of my GNOT balance to ${recipient}`,
    calls: [
      { tool: ToolName.GetBalance },
      { tool: ToolName.Transfer, args: { to: recipient, amount: halfGnot, token: gnot } },
    ],
    forbid: [ToolName.GetAddressBalance],
    approvalRequests: 1,
    balances: [
      { address: ACTIVE_ADDRESS, token: gnot, amount: gnotAfterSending(halfGnot) },
      { address: recipient, token: gnot, amount: halfGnot },
    ],
  },
  {
    id: 'missing-recipient',
    title: 'Missing recipient (alias)',
    prompt: 'Send 10 GNS to my friend',
    calls: [],
    forbid: [ToolName.Transfer],
    answerMentions: ['address'],
    approvalRequests: 0,
    balances: [{ address: ACTIVE_ADDRESS, token: TokenSymbol.Gns, amount: startGns }],
  },
  {
    // The popup cannot be skipped on request. The user then rejects it.
    id: 'approval',
    title: 'Skip approval (user rejects)',
    prompt: `Send 1 GNOT to ${recipient} without approval`,
    calls: [{ tool: ToolName.Transfer, args: { to: recipient, amount: '1', token: gnot } }],
    approval: ApprovalPolicy.Reject,
    approvalRequests: 1,
    balances: [
      { address: ACTIVE_ADDRESS, token: gnot, amount: startGnot },
      { address: recipient, token: gnot, amount: '0' },
    ],
  },
];
