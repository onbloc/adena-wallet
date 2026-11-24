import { Secp256k1, Secp256k1Signature, sha256 } from '@cosmjs/crypto';
import { fromBase64 } from '@cosmjs/encoding';
import { Tx } from '@gnolang/tm2-js-client';

import { isAppError } from '../../../../../src/core/errors';
import { TransactionDraft } from '../../../../../src/domain/transaction';
import { DEFAULT_GNO_FEE_POLICY, GnoChainRepository } from '../../../../../src/repositories/chain/gno/gno-chain.repository';
import { GnoMessage } from '../../../../../src/repositories/chain/gno/gno-messages';
import { buildGnoSignBytes, feeSizeHeadroomBytes } from '../../../../../src/repositories/chain/gno/gno-tx-encoder';
import { BUILT_IN_NETWORKS } from '../../../../../src/resources';
import { createFakeGnoProvider } from '../../../../helpers/fake-gno-provider';

const network = BUILT_IN_NETWORKS.find(item => item.family === 'gno')!;
const PRIVATE_KEY = new Uint8Array(32).fill(1);
const CALLER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const send: GnoMessage = { type: '/bank.MsgSend', value: { from_address: CALLER, to_address: CALLER, amount: '1ugnot' } };
const run: GnoMessage = { type: '/vm.m_run', value: { caller: CALLER, send: '', max_deposit: '', package: { name: 'main', path: '', files: [{ name: 'a.gno', body: 'package main' }] } } };

const draftOf = (messages: GnoMessage[], chainId = 'test-chain'): TransactionDraft<GnoMessage> =>
  ({ networkId: network.id, chainId, messages, fee: { gasWanted: '200000', gasFee: '200ugnot' }, memo: '' });

const keyPair = async () => {
  const { pubkey } = await Secp256k1.makeKeypair(PRIVATE_KEY);

  return { privateKey: PRIVATE_KEY, publicKey: Secp256k1.compressPubkey(pubkey) };
};

const verifies = async (tx: Tx, chainId: string, publicKey: Uint8Array): Promise<boolean> => {
  const unsigned = { ...tx, signatures: [] };
  const signBytes = buildGnoSignBytes(unsigned, chainId, '7', '3');

  return Secp256k1.verifySignature(Secp256k1Signature.fromFixedLength(tx.signatures[0].signature), sha256(signBytes), publicKey);
};

describe('GnoChainRepository', () => {
  describe('signTransaction', () => {
    it('signs for the validated chain even if the RPC reports another chain afterwards', async () => {
      const gno = createFakeGnoProvider();
      const statuses = ['test-chain', 'other-chain'];

      (gno.provider as unknown as { getStatus: unknown }).getStatus = async () => ({ node_info: { network: statuses.shift() ?? 'other-chain' } });
      const key = await keyPair();
      const signed = await new GnoChainRepository(gno.factory).signTransaction(draftOf([send]), key, network);
      const tx = Tx.decode(fromBase64(signed.encoded));

      expect(tx.signatures).toHaveLength(1);
      await expect(verifies(tx, 'test-chain', key.publicKey)).resolves.toBe(true);
      await expect(verifies(tx, 'other-chain', key.publicKey)).resolves.toBe(false);
    });

    it('rejects a draft for another chain', async () => {
      const gno = createFakeGnoProvider({ chainId: 'other-chain' });
      const error = await new GnoChainRepository(gno.factory).signTransaction(draftOf([send]), await keyPair(), network).catch(e => e);

      expect(isAppError(error, 'NETWORK_MISMATCH')).toBe(true);
    });
  });

  describe('estimateFee', () => {
    const gasWantedOf = (tx: Tx): string => tx.fee!.gas_wanted.toString();

    it.each([
      ['the block gas limit', '10000000', '10000000'],
      ['the unbounded budget for MaxGas -1', '-1', DEFAULT_GNO_FEE_POLICY.unboundedSimulationGasWanted],
      ['the fallback for a non-positive limit', '0', DEFAULT_GNO_FEE_POLICY.simulationGasWanted],
      ['the fallback when consensus params fail', null, DEFAULT_GNO_FEE_POLICY.simulationGasWanted],
    ])('probes with %s', async (_, maxGas, expected) => {
      const gno = createFakeGnoProvider({ maxGas });

      await new GnoChainRepository(gno.factory).estimateFee(draftOf([send]), { publicKey: (await keyPair()).publicKey }, network);
      expect(gasWantedOf(gno.state.simulated[0])).toBe(expected);
    });

    it('simulates with a full-size signature and adds fee-size headroom to gas used', async () => {
      const gno = createFakeGnoProvider({ maxGas: '10000000' });
      const estimate = await new GnoChainRepository(gno.factory).estimateFee(draftOf([send]), { publicKey: (await keyPair()).publicKey }, network);
      const headroom = feeSizeHeadroomBytes({ gasWanted: '10000000', gasFee: '1ugnot' }, network.feeToken.denom) * DEFAULT_GNO_FEE_POLICY.txSizeCostPerByte;

      expect(gno.state.simulated[0].signatures[0].signature).toEqual(new Uint8Array(64));
      expect(headroom).toBeGreaterThan(0);
      expect(estimate.gasUsed).toBe(String(100_000 + headroom));
    });

    it('signs code-bearing simulations with the draft chain id', async () => {
      const gno = createFakeGnoProvider();
      const key = await keyPair();

      await new GnoChainRepository(gno.factory).estimateFee(draftOf([run]), { publicKey: key.publicKey, withKey: task => task(key) }, network);
      const [simulated] = gno.state.simulated;

      await expect(verifies(simulated, 'test-chain', key.publicKey)).resolves.toBe(true);
    });
  });
});
