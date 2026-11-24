import { CAROL, RECIPIENT } from './harness';

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
export const SCENARIOS: Scenario[] = [
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
