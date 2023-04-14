import { LedgerConnector } from './ledger-connector';
import { RecordStore, openTransportReplayer } from '@ledgerhq/hw-transport-mocker';

export class MockLedgerConnector extends LedgerConnector {
  public static async create() {
    const store = RecordStore.fromString(`
  => e016000000
  <= 000000050107426974636f696e034254439000
`);
    const transport = await openTransportReplayer(store);
    return new MockLedgerConnector(transport);
  }
}
