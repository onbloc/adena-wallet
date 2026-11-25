// Prints the first Gno address (m/44'/118'/0'/0/0) of a mnemonic, matching the app's derivation.
import { Bip39, EnglishMnemonic, ripemd160, Secp256k1, sha256, Slip10, Slip10Curve, stringToPath } from '@cosmjs/crypto';
import { toBech32 } from '@cosmjs/encoding';

const mnemonic = process.argv.slice(2).join(' ').trim();

if (!mnemonic) {
  console.error('usage: node e2e/scripts/derive-address.mjs <mnemonic>');
  process.exit(1);
}

const seed = await Bip39.mnemonicToSeed(new EnglishMnemonic(mnemonic));
const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, stringToPath('m/44\'/118\'/0\'/0/0'));
const { pubkey } = await Secp256k1.makeKeypair(privkey);

console.log(toBech32('g', ripemd160(sha256(Secp256k1.compressPubkey(pubkey)))));
