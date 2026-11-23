#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

// Builds adena:// deep link requests for manual testing, and decodes callback responses.
//
//   node scripts/dapp-request.mjs connect
//   node scripts/dapp-request.mjs send --caller g1... --to g1... --amount 1000000ugnot
//   node scripts/dapp-request.mjs call --caller g1... --pkg gno.land/r/demo/counter --func Increment
//   node scripts/dapp-request.mjs tx --caller g1... --send g1...:1ugnot --call gno.land/r/gnoswap/gns:Transfer:g1...,1000
//   node scripts/dapp-request.mjs doc <document.json | '<json>'>
//   node scripts/dapp-request.mjs decode '<callback url>'
//
// `doc` converts an extension/adena-module Document ({ msgs, fee, chain_id, memo }) as-is.
// account_number and sequence are dropped: the wallet reads them from the chain.
// --caller <g1...> replaces the signer of every message.
// `tx` builds one multi-message transaction; --send <to>:<coins> and --call <pkg>:<func>[:arg1,arg2]
// can be repeated and keep their order.
//
// Common flags: --chain <chainId> (default gnoland-1), --sign-only (sign-transaction instead of
// sign-and-broadcast), --callback <url> (default https://example.com/adena-callback), --memo <text>.

const args = process.argv.slice(2);
const command = args[0];
const flag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);

  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
};
const has = name => args.includes(`--${name}`);
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const toBase64Url = text => Buffer.from(text, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = text => Buffer.from(text.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

if (command === 'decode') {
  const url = args[1] ?? fail('Usage: decode <callback url>');
  const response = new URL(url).searchParams.get('response') ?? fail('No response parameter in the URL');

  console.log(JSON.stringify(JSON.parse(fromBase64Url(response)), null, 2));
  process.exit(0);
}

const base = {
  version: 1,
  id: `req-${Date.now()}`,
  callback: flag('callback', 'https://example.com/adena-callback'),
  dapp: { name: flag('name', 'Adena Test dApp'), url: 'https://example.com' },
};
const chainId = flag('chain', 'gnoland-1');
const method = has('sign-only') ? 'sign-transaction' : 'sign-and-broadcast';
const caller = () => flag('caller') ?? fail('--caller <your g1 address> is required');

let payload;

switch (command) {
  case 'connect':
    payload = { ...base, method: 'connect', chainId };
    break;
  case 'send':
    payload = {
      ...base,
      method,
      chainId,
      params: {
        memo: flag('memo', ''),
        messages: [{
          type: '/bank.MsgSend',
          value: { from_address: caller(), to_address: flag('to') ?? fail('--to is required'), amount: flag('amount', '1ugnot') },
        }],
      },
    };
    break;
  case 'call':
    payload = {
      ...base,
      method,
      chainId,
      params: {
        memo: flag('memo', ''),
        messages: [{
          type: '/vm.m_call',
          value: {
            caller: caller(),
            send: flag('send', ''),
            pkg_path: flag('pkg') ?? fail('--pkg is required'),
            func: flag('func') ?? fail('--func is required'),
            args: (flag('args', '') || '').split(',').filter(Boolean),
          },
        }],
      },
    };
    break;
  case 'tx': {
    const from = caller();
    const messages = [];

    for (let index = 1; index < args.length; index++) {
      const value = args[index + 1];

      if (args[index] === '--send') {
        const [to, coins] = (value ?? '').split(':');

        if (!to || !coins) fail('--send expects <to>:<coins>');

        messages.push({ type: '/bank.MsgSend', value: { from_address: from, to_address: to, amount: coins } });
      }
      else if (args[index] === '--call') {
        const [pkg, func, argList = ''] = (value ?? '').split(':');

        if (!pkg || !func) fail('--call expects <pkg>:<func>[:arg1,arg2]');

        messages.push({ type: '/vm.m_call', value: { caller: from, send: '', pkg_path: pkg, func, args: argList.split(',').filter(Boolean) } });
      }
    }

    if (messages.length === 0) fail('Add at least one --send or --call');

    payload = { ...base, method, chainId, params: { memo: flag('memo', ''), messages } };
    break;
  }

  case 'doc': {
    const source = args[1] ?? fail('Usage: doc <document.json | json string>');
    const document = JSON.parse(existsSync(source) ? readFileSync(source, 'utf8') : source);
    const rawMsgs = Array.isArray(document.msgs) ? document.msgs : fail('document.msgs must be an array');
    // --caller re-targets every signer field to the account selected in the wallet.
    const signer = flag('caller');
    const signerFields = ['caller', 'from_address', 'creator'];
    const msgs = signer
      ? rawMsgs.map(msg => ({
          ...msg,
          value: Object.fromEntries(Object.entries(msg.value ?? {}).map(([key, value]) => [key, signerFields.includes(key) ? signer : value])),
        }))
      : rawMsgs;
    const feeCoin = document.fee?.amount?.[0];

    payload = {
      ...base,
      method,
      chainId: flag('chain', document.chain_id ?? chainId),
      params: {
        memo: document.memo ?? '',
        messages: msgs,
        ...(feeCoin && document.fee?.gas ? { gasWanted: String(document.fee.gas), gasFee: `${feeCoin.amount}${feeCoin.denom}` } : {}),
      },
    };
    break;
  }

  default:
    fail('Commands: connect | send | call | tx | doc | decode');
}

console.log(`adena://request?payload=${encodeURIComponent(toBase64Url(JSON.stringify(payload)))}`);
