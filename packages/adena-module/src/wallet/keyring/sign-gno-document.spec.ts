import { ABCIAccount, JSONRPCProvider, Provider, Tx, Wallet as Tm2Wallet } from '@gnolang/tm2-js-client';

import { makeSignedTx } from '..';
import { Document } from '../../utils/messages';
import { HDWalletKeyring } from './hd-wallet-keyring';
import { signGnoDocument } from './sign-gno-document';

const MNEMONIC =
  'source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast';

function makeDocument(body: string): Document {
  return {
    msgs: [
      {
        type: '/vm.m_addpkg',
        value: {
          creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
          deposit: '1ugnot',
          package: {
            name: 'hello',
            path: 'gno.land/r/demo/hello',
            files: [{ name: 'hello.gno', body }],
          },
        },
      },
    ],
    fee: { amount: [{ amount: '1', denom: 'ugnot' }], gas: '5000000' },
    chain_id: 'dev',
    memo: '',
    account_number: '0',
    sequence: '1',
  };
}

describe('signGnoDocument', () => {
  let mockProvider: Provider;

  beforeEach(() => {
    mockProvider = new JSONRPCProvider('');
    mockProvider.getStatus = jest.fn().mockResolvedValue({
      node_info: { network: 'dev' },
    });
    const account: ABCIAccount = {
      BaseAccount: {
        address: '',
        coins: '',
        public_key: null,
        account_number: '0',
        sequence: '1',
      },
    };
    mockProvider.getAccount = jest.fn().mockResolvedValue(account);
  });

  it('returns 64-byte signature with /tm.PubKeySecp256k1 wrapper', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const doc = makeDocument('package hello\n');
    const { signed, signature } = await signGnoDocument(
      mockProvider,
      doc,
      keyring,
      { hdPath: 0 },
    );
    expect(signature).toHaveLength(1);
    expect(signature[0].signature.length).toBe(64);
    expect(signature[0].pub_key.type_url).toBe('/tm.PubKeySecp256k1');
    expect(signed.signatures).toEqual(signature);
  });

  it.each([['<'], ['>'], ['&']])('escapes %s in Gno body', async (ch) => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const doc = makeDocument(`package hello\n// ${ch}\n`);
    const { signature } = await signGnoDocument(mockProvider, doc, keyring, {
      hdPath: 0,
    });
    expect(signature[0].signature.length).toBe(64);
  });

  it('produces identical Tx.encode bytes to legacy tm2 signing path', async () => {
    // Regression guard: pub_key.value in TxSignature must be the *compressed*
    // 33-byte secp256k1 key. Keyrings store uncompressed 65-byte keys, so
    // signGnoDocument must compress before proto-encoding. This caught
    // "unable to decode tx" on real Gnoland nodes.
    const doc = makeDocument('package hello\n// parity\n');
    const tm2Wallet = await Tm2Wallet.fromMnemonic(MNEMONIC, { accountIndex: 0 });
    tm2Wallet.connect(mockProvider);
    const legacySigned = await makeSignedTx(tm2Wallet, doc);
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const { signed: newSigned } = await signGnoDocument(
      mockProvider,
      doc,
      keyring,
      { hdPath: 0 },
    );
    const legacyHex = Buffer.from(Tx.encode(legacySigned).finish()).toString('hex');
    const newHex = Buffer.from(Tx.encode(newSigned).finish()).toString('hex');
    expect(newHex).toBe(legacyHex);
    expect(newSigned.signatures[0].pub_key.value.length).toBe(35);
  });

  it('fetches account_number/sequence via correct bech32 address when missing', async () => {
    // account_number/sequence fallback must query provider with the address
    // produced by publicKeyToAddress (compresses pubkey first), not the raw
    // ripemd160(sha256(uncompressed)) path.
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const doc: Document = {
      ...makeDocument('package hello\n'),
      account_number: '',
      sequence: '',
    };
    const { signature } = await signGnoDocument(mockProvider, doc, keyring, {
      hdPath: 0,
    });
    expect(signature[0].signature.length).toBe(64);
    expect(mockProvider.getAccount).toHaveBeenCalledWith(
      'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
    );
  });
});
