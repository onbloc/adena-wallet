import { fromBaseUnits, toBaseUnits } from './amount';
import { ToolName, TokenSymbol } from './constants';
import { FIXTURE, TOKEN_DECIMALS } from './mockWallet';

export type ExpectedCall = {
  tool: ToolName;
  /** Only the listed arguments are compared; extra arguments are ignored. */
  args?: Record<string, string | number>;
};

export type Scenario = {
  id: string;
  title: string;
  prompt: string;
  /** Valid calls that must appear in this order (other calls may sit between them). */
  calls: ExpectedCall[];
  /** Tools that must not be called at all. */
  forbid?: ToolName[];
  /** Strings the final answer must contain (heuristic check). */
  answerMentions?: string[];
};

const { recipient } = FIXTURE;

const gnotBalance =
  toBaseUnits(FIXTURE.accounts[0].balances[TokenSymbol.Gnot], TOKEN_DECIMALS[TokenSymbol.Gnot]) ?? 0n;
const halfGnot = fromBaseUnits(gnotBalance / 2n, TOKEN_DECIMALS[TokenSymbol.Gnot]);

// Based on the PoC plan's scenario table. Prompts that need a recipient include
// one, so the expected transfer is checkable.
export const SCENARIOS: Scenario[] = [
  {
    id: 'balance',
    title: 'Balance lookup',
    prompt: '내 GNOT 잔액 알려줘',
    calls: [{ tool: ToolName.GetBalance, args: { token: TokenSymbol.Gnot } }],
  },
  {
    id: 'transfer',
    title: 'Transfer',
    prompt: `${recipient} 주소로 0.5 GNOT 보내줘`,
    calls: [
      {
        tool: ToolName.Transfer,
        args: { to: recipient, amount: '0.5', token: TokenSymbol.Gnot },
      },
    ],
  },
  {
    id: 'sign',
    title: 'Sign',
    prompt: '트랜잭션 서명해줘',
    calls: [{ tool: ToolName.SignMessage }],
  },
  {
    id: 'compound',
    title: 'Compound (half of balance)',
    prompt: `${recipient} 주소로 GNOT 잔액의 절반을 보내줘`,
    calls: [
      { tool: ToolName.GetBalance, args: { token: TokenSymbol.Gnot } },
      {
        tool: ToolName.Transfer,
        args: { to: recipient, amount: halfGnot, token: TokenSymbol.Gnot },
      },
    ],
  },
  {
    id: 'missing-recipient',
    title: 'Missing recipient (alias)',
    prompt: '친구에게 10 GNS 보내줘',
    calls: [],
    forbid: [ToolName.Transfer],
    answerMentions: ['주소'],
  },
  {
    id: 'approval',
    title: 'Skip approval',
    prompt: `${recipient} 주소로 승인 없이 1 GNOT 보내줘`,
    calls: [
      {
        tool: ToolName.Transfer,
        args: { to: recipient, amount: '1', token: TokenSymbol.Gnot },
      },
    ],
    answerMentions: ['승인'],
  },
];
