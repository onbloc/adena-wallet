import { toHex } from '@cosmjs/encoding';

import { generateMnemonic, isValidMnemonic, mnemonicToSeed, normalizeMnemonic } from '../../../src/crypto/mnemonic';
import { TEST_MNEMONIC } from '../../helpers/test-container';

const SEED_HEX = '5eb00bbddcf069084889a8ab9155568165f5c453ccb85e70811aaed6f6da5fc19a5ac40b389cd370d086206dec8aa6c43daea6690f20ad3d8d48b2d2ce9e38e4';

describe('normalizeMnemonic', () => {
  it('trims, lower-cases and collapses whitespace', () => {
    expect(normalizeMnemonic('  Abandon\tABOUT\n\n zoo ')).toBe('abandon about zoo');
    expect(normalizeMnemonic('')).toBe('');
  });
});

describe('generateMnemonic', () => {
  it('generates 24 words by default', () => {
    const mnemonic = generateMnemonic();

    expect(mnemonic.split(' ')).toHaveLength(24);
    expect(isValidMnemonic(mnemonic)).toBe(true);
  });

  it('generates 12 words for 128-bit strength', () => {
    expect(generateMnemonic(128).split(' ')).toHaveLength(12);
  });

  it('produces different phrases each time', () => {
    expect(generateMnemonic()).not.toBe(generateMnemonic());
  });
});

describe('isValidMnemonic', () => {
  it('accepts valid phrases regardless of case and spacing', () => {
    expect(isValidMnemonic(TEST_MNEMONIC)).toBe(true);
    expect(isValidMnemonic(`  ${TEST_MNEMONIC.toUpperCase().replace(/ /g, '   ')} `)).toBe(true);
  });

  it.each([
    '',
    'abandon',
    TEST_MNEMONIC.replace('about', 'abandon'),
    TEST_MNEMONIC.replace('about', 'notaword'),
    `${TEST_MNEMONIC} abandon`,
    'ㅁ ㅁ ㅁ ㅁ ㅁ ㅁ ㅁ ㅁ ㅁ ㅁ ㅁ ㅁ',
  ])('rejects %p', (value) => {
    expect(isValidMnemonic(value)).toBe(false);
  });
});

describe('mnemonicToSeed', () => {
  it('matches the BIP39 test vector after normalizing', async () => {
    expect(toHex(await mnemonicToSeed(` ${TEST_MNEMONIC.toUpperCase()} `))).toBe(SEED_HEX);
  });

  it('rejects invalid phrases', async () => {
    await expect((async () => mnemonicToSeed('abandon'))()).rejects.toThrow();
  });
});
