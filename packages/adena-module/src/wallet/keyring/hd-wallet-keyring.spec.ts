import { generateKeyPair, TransactionEndpoint, Tx } from '@gnolang/tm2-js-client';

import { generateKeyPairByHdPath } from './hd-path';
import { HDWalletKeyring } from './hd-wallet-keyring';

// A valid BIP39 test mnemonic (checksum-correct). Never used for real funds.
const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('HDWalletKeyring', () => {
  it('derives from the stored seed the same keys as from the mnemonic', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    for (const index of [0, 1, 42]) {
      const legacy = await generateKeyPair(MNEMONIC, index);
      const { privateKey, publicKey } = await keyring.getKeypair(index);

      expect(Array.from(privateKey)).toEqual(Array.from(legacy.privateKey));
      expect(Array.from(publicKey)).toEqual(Array.from(legacy.publicKey));
    }

    const path = { account: 2, change: 1, addressIndex: 3 };
    const expected = await generateKeyPairByHdPath(MNEMONIC, path);
    const actual = await keyring.getKeypair(path);
    expect(Array.from(actual.privateKey)).toEqual(Array.from(expected.privateKey));
  });

  it('keeps deriving the same keys after a storage round trip', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const restored = new HDWalletKeyring(JSON.parse(JSON.stringify(keyring.toData())));

    expect(Array.from(await restored.getPublicKey(7))).toEqual(
      Array.from(await keyring.getPublicKey(7)),
    );
  });

  it('broadcasts the encoded transaction without deriving a key', async () => {
    const keyring = await HDWalletKeyring.fromMnemonic(MNEMONIC);
    const sendTransaction = jest.fn().mockResolvedValue({ hash: 'h' });
    const provider = { sendTransaction } as any;
    const tx = Tx.fromPartial({ memo: 'm' });

    await keyring.broadcastTxCommit(provider, tx);

    const [encoded, endpoint] = sendTransaction.mock.calls[0];
    expect(endpoint).toBe(TransactionEndpoint.BROADCAST_TX_COMMIT);
    expect(Tx.decode(Buffer.from(encoded, 'base64')).memo).toBe('m');
  });
});
