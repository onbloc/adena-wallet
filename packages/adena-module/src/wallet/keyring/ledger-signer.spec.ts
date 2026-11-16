import { LedgerConnector } from '@cosmjs/ledger-amino';
import Transport from '@ledgerhq/hw-transport';

import { LedgerError } from '../../ledger/ledger-errors';
import { FullPathLedgerSigner } from './ledger-signer';
import { LedgerKeyring } from './ledger-keyring';

const OK = Buffer.from([0x90, 0x00]);
const TRANSACTION_REJECTED = Buffer.from([0x69, 0x86]);
const PAYLOAD_LAST = 0x02;

// Answers the APDUs the Cosmos app exchanges before and during signing, and
// rejects on the last sign chunk the way the device does when the user declines.
class RejectingTransport extends Transport {
  async exchange(apdu: Buffer): Promise<Buffer> {
    const [cla, ins, p1] = apdu;
    if (cla === 0xb0 && ins === 0x01) {
      const name = Buffer.from('Cosmos');
      const version = Buffer.from('2.35.0');
      return Buffer.concat([
        Buffer.from([1, name.length]),
        name,
        Buffer.from([version.length]),
        version,
        Buffer.from([1, 0]),
        OK,
      ]);
    }
    if (cla === 0x55 && ins === 0x00) {
      return Buffer.concat([Buffer.from([0, 2, 35, 0, 0, 0, 0, 0, 0]), OK]);
    }
    if (cla === 0x55 && ins === 0x02) {
      return p1 === PAYLOAD_LAST ? TRANSACTION_REJECTED : OK;
    }
    throw new Error(`unexpected APDU ${apdu.toString('hex')}`);
  }
}

const BYTES = new TextEncoder().encode('{"chain_id":"test"}');

describe('Ledger user rejection', () => {
  it('surfaces as UserRejected from the Gno signer', async () => {
    const signer = new FullPathLedgerSigner(new LedgerConnector(new RejectingTransport()), 0);

    const error = await signer.signData(BYTES).catch((e) => e);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error.kind).toBe('UserRejected');
  });

  it('surfaces as UserRejected from LedgerKeyring.signRaw', async () => {
    const keyring = new LedgerKeyring({});
    keyring.setConnector(new LedgerConnector(new RejectingTransport()));

    const error = await keyring.signRaw(BYTES).catch((e) => e);

    expect(error).toBeInstanceOf(LedgerError);
    expect(error.kind).toBe('UserRejected');
  });
});
