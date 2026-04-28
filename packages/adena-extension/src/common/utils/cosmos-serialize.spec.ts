import type { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import {
  deserializeSignDoc,
  deserializeTxBytes,
  serializeSignDoc,
  serializeTxBytes,
} from './cosmos-serialize';

const sampleSignDoc: SignDoc = {
  bodyBytes: new Uint8Array([10, 20, 30, 40, 50, 255, 0, 128]),
  authInfoBytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  chainId: 'atomone-1',
  accountNumber: BigInt('12345678901234567890'),
};

describe('cosmos-serialize', () => {
  describe('serializeSignDoc / deserializeSignDoc', () => {
    it('produces a JSON-safe SignDoc', () => {
      const serialized = serializeSignDoc(sampleSignDoc);

      expect(typeof serialized.bodyBytes).toBe('string');
      expect(typeof serialized.authInfoBytes).toBe('string');
      expect(typeof serialized.accountNumber).toBe('string');
      expect(serialized.chainId).toBe('atomone-1');
      expect(() => JSON.stringify(serialized)).not.toThrow();
    });

    it('preserves bigint accountNumber through a JSON round-trip', () => {
      const serialized = serializeSignDoc(sampleSignDoc);
      const jsonRoundtrip = JSON.parse(JSON.stringify(serialized));
      const rebuilt = deserializeSignDoc(jsonRoundtrip);

      expect(rebuilt.accountNumber).toBe(sampleSignDoc.accountNumber);
      expect(typeof rebuilt.accountNumber).toBe('bigint');
    });

    it('preserves Uint8Array bytes through a JSON round-trip', () => {
      const serialized = serializeSignDoc(sampleSignDoc);
      const jsonRoundtrip = JSON.parse(JSON.stringify(serialized));
      const rebuilt = deserializeSignDoc(jsonRoundtrip);

      expect(rebuilt.bodyBytes).toBeInstanceOf(Uint8Array);
      expect(rebuilt.authInfoBytes).toBeInstanceOf(Uint8Array);
      expect(Array.from(rebuilt.bodyBytes)).toEqual(Array.from(sampleSignDoc.bodyBytes));
      expect(Array.from(rebuilt.authInfoBytes)).toEqual(
        Array.from(sampleSignDoc.authInfoBytes),
      );
    });

    it('handles accountNumber = 0n', () => {
      const zeroDoc: SignDoc = { ...sampleSignDoc, accountNumber: BigInt(0) };
      const rebuilt = deserializeSignDoc(serializeSignDoc(zeroDoc));
      expect(rebuilt.accountNumber).toBe(BigInt(0));
    });

    it('handles empty byte arrays', () => {
      const emptyDoc: SignDoc = {
        ...sampleSignDoc,
        bodyBytes: new Uint8Array(),
        authInfoBytes: new Uint8Array(),
      };
      const rebuilt = deserializeSignDoc(serializeSignDoc(emptyDoc));
      expect(rebuilt.bodyBytes.length).toBe(0);
      expect(rebuilt.authInfoBytes.length).toBe(0);
    });
  });

  describe('serializeTxBytes / deserializeTxBytes', () => {
    it('round-trips arbitrary binary content through base64', () => {
      const tx = new Uint8Array([0, 1, 127, 128, 255]);
      const rebuilt = deserializeTxBytes(serializeTxBytes(tx));
      expect(rebuilt).toBeInstanceOf(Uint8Array);
      expect(Array.from(rebuilt)).toEqual(Array.from(tx));
    });

    it('produces a JSON-safe string', () => {
      const tx = new Uint8Array([42, 100, 200]);
      const encoded = serializeTxBytes(tx);
      expect(typeof encoded).toBe('string');
      expect(() => JSON.stringify(encoded)).not.toThrow();
    });

    it('handles an empty tx', () => {
      const rebuilt = deserializeTxBytes(serializeTxBytes(new Uint8Array()));
      expect(rebuilt.length).toBe(0);
    });
  });
});
