import { Secp256k1 } from '@cosmjs/crypto';
import { fromBase64, fromHex, toBase64 } from '@cosmjs/encoding';
import { MsgSend } from '@gnolang/gno-js-client';
import { PubKeySecp256k1, Tx } from '@gnolang/tm2-js-client';

import { SessionTaskStatus } from '../../../src/domain/session-task';
import { StorageSessionTaskRepository } from '../../../src/repositories/session-task.repository';
import { SessionTaskService } from '../../../src/services/session-task.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { setupWallet } from '../../helpers/render-screen';
import { createTestContainer } from '../../helpers/test-container';

const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const waitFor = async (check: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 100 && !check(); attempt++) {
    await new Promise(resolve => setTimeout(resolve, 20));
  }
};

describe('SessionTaskService', () => {
  const setup = async (spendUsed = '0ugnot') => {
    const env = createTestContainer();
    const wallet = await setupWallet(env);
    const privateKey = fromHex('22'.repeat(32));
    const publicKey = Secp256k1.compressPubkey((await Secp256k1.makeKeypair(privateKey)).pubkey);
    const sessionAddress = env.container.chainRegistry.forNetwork(wallet.network).deriveAddress(publicKey, wallet.network);

    env.gno.state.sessions[wallet.address] = [{
      address: sessionAddress,
      master_address: wallet.address,
      public_key: { '@type': '/tm.PubKeySecp256k1', value: toBase64(publicKey) },
      account_number: '24',
      sequence: '3',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      spend_limit: '1000000ugnot',
      spend_used: spendUsed,
      spend_period: 0,
      spend_reset: 0,
      allow_paths: ['bank/send'],
    }];

    const repository = new StorageSessionTaskRepository(new MemoryKeyValueStore());
    const service = new SessionTaskService(env.container.chainRegistry, repository);
    const input = { network: wallet.network, accountId: wallet.account.id, masterAddress: wallet.address, sessionAddress, toAddress: RECIPIENT, amount: '100000', delaySeconds: 0.05 };

    return { ...wallet, env, service, repository, privateKey, publicKey, sessionAddress, input };
  };

  it('sends from the master, signed by the card with the session\'s own signer state, and wipes the key', async () => {
    const { env, service, privateKey, publicKey, sessionAddress, address, input } = await setup();
    const key = Uint8Array.from(privateKey);
    const task = service.scheduleSend(input, key);

    expect(key).toEqual(new Uint8Array(32));
    expect(task.status).toBe(SessionTaskStatus.SCHEDULED);

    await waitFor(() => service.list()[0].status === SessionTaskStatus.SENT);

    const tx = Tx.decode(fromBase64(env.gno.state.broadcasts[0]));

    expect(service.list()[0]).toMatchObject({ status: SessionTaskStatus.SENT, txHash: 'HASH' });
    expect(MsgSend.decode(tx.messages[0].value)).toMatchObject({ from_address: address, to_address: RECIPIENT, amount: '100000ugnot' });
    expect(tx.signatures[0].session_addr).toBe(sessionAddress);
    expect(PubKeySecp256k1.decode(tx.signatures[0].pub_key!.value).key).toEqual(publicKey);
    // Fee estimated as the session too.
    expect(env.gno.state.simulated.at(-1)?.signatures[0].session_addr).toBe(sessionAddress);
  });

  it('fails without broadcasting when the card limit cannot cover the send and its fee', async () => {
    const { env, service, privateKey, input } = await setup('950000ugnot');

    service.scheduleSend(input, Uint8Array.from(privateKey));
    await waitFor(() => service.list()[0].status === SessionTaskStatus.FAILED);

    expect(service.list()[0].error).toBe('The card limit does not cover this send and its fee');
    expect(env.gno.state.broadcasts).toHaveLength(0);
  });

  it('cancels with the card and reports tasks a restart cut short as missed', async () => {
    const { env, service, repository, privateKey, input, sessionAddress } = await setup();

    service.scheduleSend({ ...input, delaySeconds: 60 }, Uint8Array.from(privateKey));
    service.cancelForSession(sessionAddress);
    expect(service.list()[0]).toMatchObject({ status: SessionTaskStatus.FAILED, error: 'Cancelled' });

    repository.save({ ...service.list()[0], id: 'stale', status: SessionTaskStatus.SCHEDULED });
    const restarted = new SessionTaskService(env.container.chainRegistry, repository);

    expect(restarted.list().find(task => task.id === 'stale')?.status).toBe(SessionTaskStatus.MISSED);
  });
});
