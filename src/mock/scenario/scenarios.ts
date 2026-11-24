import { CAROL, RECIPIENT } from './fixture';

/** What the prepared transaction must be. `none`: the model must not prepare any. */
export type Expected =
  | { kind: 'transfer'; to: string; amount: string; token: 'GNOT' | 'GNS' }
  | { kind: 'allowance'; spender: string; amount: string; token: 'GNS' }
  | { kind: 'none' };

export type Scenario = { name: string; prompt: string; expected: Expected };

const transfer = (to: string, amount: string, token: 'GNOT' | 'GNS' = 'GNOT'): Expected => ({
  kind: 'transfer',
  to,
  amount,
  token,
});
const allowance = (spender: string, amount: string): Expected => ({ kind: 'allowance', spender, amount, token: 'GNS' });
const none: Expected = { kind: 'none' };

// The account holds 10 GNOT and 250 GNS; "carol" is its only contact.
export const ENGLISH_SCENARIOS: Scenario[] = [
  { name: 'transfer GNOT to an address', prompt: `Send 0.5 GNOT to ${RECIPIENT}`, expected: transfer(RECIPIENT, '0.5') },
  { name: 'transfer GNOT to an address, casual phrasing', prompt: `${RECIPIENT} needs 2 GNOT, can you send it over?`, expected: transfer(RECIPIENT, '2') },
  { name: 'transfer to a contact', prompt: 'Send 1 GNOT to carol', expected: transfer(CAROL, '1') },
  { name: 'transfer to a contact, casual phrasing', prompt: 'Can you pay carol 1.5 GNOT?', expected: transfer(CAROL, '1.5') },
  { name: 'transfer with a lowercase symbol', prompt: 'please send 3 gnot to carol', expected: transfer(CAROL, '3') },
  { name: 'transfer a GRC20 token', prompt: 'Transfer 25 GNS to carol', expected: transfer(CAROL, '25', 'GNS') },
  { name: 'transfer an amount that depends on the balance', prompt: 'Send half of my GNOT to carol', expected: transfer(CAROL, '5') },
  { name: 'approve a contact', prompt: 'Approve carol to spend up to 10 GNS', expected: allowance(CAROL, '10') },
  { name: 'approve a contact, casual phrasing', prompt: 'Allow carol to use up to 100 of my GNS', expected: allowance(CAROL, '100') },
  { name: 'approve an address', prompt: `Let ${RECIPIENT} spend 7.5 GNS from my account`, expected: allowance(RECIPIENT, '7.5') },
  { name: 'no recipient: asks instead of preparing', prompt: 'Send 1 GNOT', expected: none },
  { name: 'unknown token: nothing prepared', prompt: 'Send 1 FOO to carol', expected: none },
  { name: 'approval of the native token: nothing prepared', prompt: 'Approve carol to spend 5 GNOT', expected: none },
  { name: 'zero amount: nothing prepared', prompt: 'Send 0 GNOT to carol', expected: none },
  { name: 'insufficient GNOT balance: nothing prepared', prompt: 'Send 100 GNOT to carol', expected: none },
];

// The same requests in Korean, keyed by the English scenario name so each expects exactly what its
// English twin expects. Users write the contact's name in Latin letters with a Korean particle.
const KOREAN_PROMPTS: Record<string, string> = {
  'transfer GNOT to an address': `${RECIPIENT} 여기로 0.5 GNOT 전송`,
  'transfer GNOT to an address, casual phrasing': `${RECIPIENT}한테 2 GNOT 보내줄 수 있어?`,
  'transfer to a contact': 'carol에게 1 GNOT 보내줘',
  'transfer to a contact, casual phrasing': 'carol한테 1.5 GNOT 좀 보내줄래?',
  'transfer with a lowercase symbol': 'carol에게 3 gnot 보내줘',
  'transfer a GRC20 token': 'carol에게 GNS 25개 전송해줘',
  'transfer an amount that depends on the balance': '내 GNOT의 절반을 carol에게 보내줘',
  'approve a contact': 'carol이 GNS를 10개까지 쓸 수 있게 승인해줘',
  'approve a contact, casual phrasing': 'carol이 내 GNS 100개를 사용할 수 있도록 허용해줘',
  'approve an address': `${RECIPIENT}가 내 계정에서 GNS 7.5개를 쓸 수 있게 해줘`,
  'no recipient: asks instead of preparing': '1 GNOT 보내줘',
  'unknown token: nothing prepared': 'carol에게 FOO 1개 보내줘',
  'approval of the native token: nothing prepared': 'carol이 GNOT 5개를 쓸 수 있게 승인해줘',
  'zero amount: nothing prepared': 'carol에게 0 GNOT 보내줘',
  'insufficient GNOT balance: nothing prepared': 'carol에게 100 GNOT 보내줘',
};

export const KOREAN_SCENARIOS: Scenario[] = ENGLISH_SCENARIOS.map(({ name, expected }) => ({
  name: `ko: ${name}`,
  prompt: KOREAN_PROMPTS[name],
  expected,
}));

export const SCENARIOS: Scenario[] = [...ENGLISH_SCENARIOS, ...KOREAN_SCENARIOS];
