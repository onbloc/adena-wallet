import { Secp256k1, Secp256k1Signature } from '@cosmjs/crypto';

import { sha256 } from '../../crypto';
import { AddressKeyring } from './address-keyring';
import { HDWalletKeyring } from './hd-wallet-keyring';
import { LedgerKeyring } from './ledger-keyring';
import { MultisigKeyring } from './multisig-keyring';
import { PrivateKeyKeyring } from './private-key-keyring';
import { Web3AuthKeyring } from './web3-auth-keyring';

const MNEMONIC =
  'source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast';
const BYTES = new TextEncoder().encode('hello gno signRaw');

describe('Keyring.signRaw — private-key keyrings', () => {
  it('HDWalletKeyring produces 64-byte r||s signature', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const sig = await keyring.signRaw(BYTES);
    expect(sig.length).toBe(64);
  });

  it('PrivateKeyKeyring produces 64-byte r||s signature', async () => {
    const hd = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const privateKey = await hd.getPrivateKey(0);
    const publicKey = await hd.getPublicKey(0);
    const keyring = new PrivateKeyKeyring({
      privateKey: Array.from(privateKey),
      publicKey: Array.from(publicKey),
    });
    const sig = await keyring.signRaw(BYTES);
    expect(sig.length).toBe(64);
  });

  it('Web3AuthKeyring produces 64-byte r||s signature', async () => {
    const hd = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const privateKey = await hd.getPrivateKey(0);
    const publicKey = await hd.getPublicKey(0);
    const keyring = new Web3AuthKeyring({
      privateKey: Array.from(privateKey),
      publicKey: Array.from(publicKey),
    });
    const sig = await keyring.signRaw(BYTES);
    expect(sig.length).toBe(64);
  });

  it('is deterministic (RFC6979)', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const a = await keyring.signRaw(BYTES);
    const b = await keyring.signRaw(BYTES);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it('verifies against secp256k1 pubkey', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const sig = await keyring.signRaw(BYTES);
    const pubkey = await keyring.getPublicKey(0);
    const ok = await Secp256k1.verifySignature(
      Secp256k1Signature.fromFixedLength(sig),
      sha256(BYTES),
      pubkey,
    );
    expect(ok).toBe(true);
  });

  it('HD signRaw uses requested hdPath', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const sig0 = await keyring.signRaw(BYTES, { hdPath: 0 });
    const sig1 = await keyring.signRaw(BYTES, { hdPath: 1 });
    expect(Buffer.from(sig0).equals(Buffer.from(sig1))).toBe(false);
  });

  it('non-HD keyrings ignore hdPath option', async () => {
    const hd = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const privateKey = await hd.getPrivateKey(0);
    const publicKey = await hd.getPublicKey(0);
    const pk = new PrivateKeyKeyring({
      privateKey: Array.from(privateKey),
      publicKey: Array.from(publicKey),
    });
    const web3 = new Web3AuthKeyring({
      privateKey: Array.from(privateKey),
      publicKey: Array.from(publicKey),
    });
    const pkSig0 = await pk.signRaw(BYTES, { hdPath: 0 });
    const pkSig99 = await pk.signRaw(BYTES, { hdPath: 99 });
    expect(Buffer.from(pkSig0).equals(Buffer.from(pkSig99))).toBe(true);
    const web3Sig0 = await web3.signRaw(BYTES, { hdPath: 0 });
    const web3Sig99 = await web3.signRaw(BYTES, { hdPath: 99 });
    expect(Buffer.from(web3Sig0).equals(Buffer.from(web3Sig99))).toBe(true);
  });
});

describe('Keyring.signRaw — non-signing keyrings', () => {
  it('LedgerKeyring throws Phase 7 message', async () => {
    const keyring = new LedgerKeyring({});
    await expect(keyring.signRaw(BYTES)).rejects.toThrow(/Phase 7/);
  });

  it('AddressKeyring throws AIRGAP message', async () => {
    const keyring = await AddressKeyring.fromAddress(
      'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
    );
    await expect(keyring.signRaw(BYTES)).rejects.toThrow(/AIRGAP/);
  });

  it('MultisigKeyring throws multisig message', async () => {
    const keyring = new MultisigKeyring({
      addressBytes: [
        146, 15, 181, 241, 124, 45, 175, 116, 187, 21, 153, 183, 203, 224, 41, 90, 94, 30, 201, 183,
      ],
      multisigConfig: {
        threshold: 2,
        signers: [
          'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
          'g1kcdd3n0d472g2p5l8svyg9t0wq6h5857nq992f',
        ],
      },
    });
    await expect(keyring.signRaw(BYTES)).rejects.toThrow(/Multisig/);
  });
});
