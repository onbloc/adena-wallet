import { serializeSignDoc, StdSignDoc } from '@cosmjs/amino';
import { Secp256k1, Secp256k1Signature, sha256 } from '@cosmjs/crypto';

import { fromBase64 } from '../../encoding/base64';
import { fromUtf8 } from '../../encoding/utf8';
import { compressPubkeyIfNeeded } from '../../utils/pubkey';
import { HDWalletKeyring } from './hd-wallet-keyring';
import {
  ARBITRARY_MSG_TYPE,
  getArbitraryMessageSignBytes,
  makeArbitraryMessageDoc,
  signArbitraryMessage,
} from './sign-arbitrary';

const MNEMONIC =
  'source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast';

// Address derived from MNEMONIC at index 0, the same fixture the other keyring
// specs use.
const SIGNER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const CHAIN_ID = 'gnoland-1';

describe('makeArbitraryMessageDoc', () => {
  it('carries the chain id, so a proof cannot be replayed onto another network', () => {
    expect(makeArbitraryMessageDoc(CHAIN_ID, SIGNER, 'hello').chain_id).toBe(CHAIN_ID);
  });

  it('zeroes account number, sequence and gas', () => {
    const doc = makeArbitraryMessageDoc(CHAIN_ID, SIGNER, 'hello');
    expect(doc.account_number).toBe('0');
    expect(doc.sequence).toBe('0');
    expect(doc.fee.gas).toBe('0');
    expect(doc.memo).toBe('');
  });

  // A zero fee is the absence of coins. Rendering it as a zero coin would both
  // misstate the document and risk rejection by the Ledger Cosmos app, which
  // displays every coin it is handed.
  it('renders a zero fee as an empty coin list, never as a zero coin', () => {
    expect(makeArbitraryMessageDoc(CHAIN_ID, SIGNER, 'hello').fee.amount).toEqual([]);
  });

  it('carries exactly one sign/MsgSignData message', () => {
    const doc = makeArbitraryMessageDoc(CHAIN_ID, SIGNER, 'hello');
    expect(doc.msgs).toHaveLength(1);
    expect(doc.msgs[0].type).toBe(ARBITRARY_MSG_TYPE);
    expect(doc.msgs[0].value.signer).toBe(SIGNER);
  });

  it('base64-encodes the message as UTF-8, including non-ASCII', () => {
    const message = 'Sign in to Gnoland · 서명 · 🔑';
    const doc = makeArbitraryMessageDoc(CHAIN_ID, SIGNER, message);
    expect(fromUtf8(fromBase64(doc.msgs[0].value.data))).toBe(message);
  });
});

describe('getArbitraryMessageSignBytes', () => {
  // Locks the exact bytes a verifier must reproduce. Any change to key order,
  // escaping or field rendering breaks this test rather than silently breaking
  // every signature already issued.
  it('matches the pinned signature payload', () => {
    const doc = makeArbitraryMessageDoc(CHAIN_ID, SIGNER, 'hello');
    expect(fromUtf8(getArbitraryMessageSignBytes(doc))).toBe(
      '{"account_number":"0","chain_id":"gnoland-1","fee":{"amount":[],"gas":"0"},"memo":"",' +
        '"msgs":[{"type":"sign/MsgSignData","value":{"data":"aGVsbG8=",' +
        '"signer":"g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5"}}],"sequence":"0"}',
    );
  });

  // The tm2 pipeline (sortedJsonStringify + encodeCharacterSet + UTF-8) and the
  // Cosmos one (@cosmjs/amino serializeSignDoc) must agree byte for byte.
  // Testing our serializer only against itself would prove nothing; agreeing
  // with a separate implementation is what makes the payload interoperable.
  it('agrees byte for byte with the Cosmos amino serializer', () => {
    const messages = ['hello', 'Sign in to Gnoland · 서명 · 🔑', 'a<b>c&d', ''.padEnd(512, 'x')];

    for (const message of messages) {
      const doc = makeArbitraryMessageDoc(CHAIN_ID, SIGNER, message);
      expect(getArbitraryMessageSignBytes(doc)).toEqual(
        serializeSignDoc(doc as unknown as StdSignDoc),
      );
    }
  });
});

describe('signArbitraryMessage', () => {
  it('produces a signature an independent verifier accepts', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const publicKey = await keyring.getPublicKey(0);

    const { doc, signature } = await signArbitraryMessage({
      keyring,
      publicKey,
      chainId: CHAIN_ID,
      signer: SIGNER,
      data: 'hello',
    });

    expect(signature).toHaveLength(64);

    const verified = Secp256k1.verifySignature(
      Secp256k1Signature.fromFixedLength(signature),
      sha256(getArbitraryMessageSignBytes(doc)),
      compressPubkeyIfNeeded(publicKey),
    );
    expect(verified).toBe(true);
  });

  it('rejects a signer the signing key does not derive', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const publicKey = await keyring.getPublicKey(0);

    await expect(
      signArbitraryMessage({
        keyring,
        publicKey,
        chainId: CHAIN_ID,
        signer: 'g1234567890abcdefghijklmnopqrstuvwxyzabc',
        data: 'hello',
      }),
    ).rejects.toThrow('Signer does not match the signing key');
  });

  it('rejects an empty message', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const publicKey = await keyring.getPublicKey(0);

    await expect(
      signArbitraryMessage({ keyring, publicKey, chainId: CHAIN_ID, signer: SIGNER, data: '' }),
    ).rejects.toThrow('non-empty message');
  });

  it('rejects an empty chain id, which would drop the network binding', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const publicKey = await keyring.getPublicKey(0);

    await expect(
      signArbitraryMessage({ keyring, publicKey, chainId: '', signer: SIGNER, data: 'hello' }),
    ).rejects.toThrow('requires a chain id');
  });
});
