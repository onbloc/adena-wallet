import { LedgerConnector } from '@cosmjs/ledger-amino';
import { generateHDPath } from '@gnolang/tm2-js-client';

import { LedgerError } from '../../ledger/ledger-errors';
import { LedgerKeyring } from './ledger-keyring';

const BYTES = new TextEncoder().encode('cosmos amino sign doc');

function makeConnector(sign: jest.Mock): LedgerConnector {
  return {
    sign,
    getPubkey: jest.fn(),
  } as unknown as LedgerConnector;
}

async function attachConnector(sign: jest.Mock): Promise<LedgerKeyring> {
  const keyring = new LedgerKeyring({});
  keyring.setConnector(makeConnector(sign));
  return keyring;
}

describe('LedgerKeyring.signRaw', () => {
  it('returns the 64-byte r||s signature produced by the connector', async () => {
    const signature = new Uint8Array(64).fill(0x07);
    const sign = jest.fn().mockResolvedValue(signature);
    const keyring = await attachConnector(sign);

    const result = await keyring.signRaw(BYTES);

    expect(result).toBe(signature);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(sign.mock.calls[0][0]).toBe(BYTES);
    expect(sign.mock.calls[0][1]).toEqual(generateHDPath(0));
  });

  it('forwards the requested hdPath index to the connector', async () => {
    const sign = jest.fn().mockResolvedValue(new Uint8Array(64));
    const keyring = await attachConnector(sign);

    await keyring.signRaw(BYTES, { hdPath: 3 });

    expect(sign.mock.calls[0][1]).toEqual(generateHDPath(3));
  });

  it('throws LedgerError(TransportFailed) when the connector is not attached', async () => {
    const keyring = new LedgerKeyring({});

    await expect(keyring.signRaw(BYTES)).rejects.toBeInstanceOf(LedgerError);
    await expect(keyring.signRaw(BYTES)).rejects.toMatchObject({
      kind: 'TransportFailed',
    });
  });

  it.each<[string, unknown, string]>([
    ['device locked (0x6b0c)', { return_code: 0x6b0c, error_message: 'locked' }, 'DeviceLocked'],
    ['user rejected (0x6985)', { return_code: 0x6985, error_message: 'denied' }, 'UserRejected'],
    [
      'cosmjs "Please open the Cosmos Ledger app" message',
      new Error('Please open the Cosmos Ledger app on your Ledger device.'),
      'AppNotOpen',
    ],
    ['transport disconnect', new Error('Transport was disconnected'), 'TransportFailed'],
  ])('classifies %s as %s', async (_label, thrown, expectedKind) => {
    const sign = jest.fn().mockRejectedValue(thrown);
    const keyring = await attachConnector(sign);

    await expect(keyring.signRaw(BYTES)).rejects.toMatchObject({
      name: 'LedgerError',
      kind: expectedKind,
    });
  });

  it('preserves existing LedgerError instances without re-wrapping', async () => {
    const original = new LedgerError('UserRejected', 'user tapped reject');
    const sign = jest.fn().mockRejectedValue(original);
    const keyring = await attachConnector(sign);

    await expect(keyring.signRaw(BYTES)).rejects.toBe(original);
  });
});
