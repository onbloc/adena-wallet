import { Any, decodeTxMessages, MemFile, MemPackage, MsgAddPackage, MsgCall, MsgRun, MsgSend } from '@gnolang/gno-js-client';
import {
  encodeCharacterSet,
  parseSignCoin,
  PubKeySecp256k1,
  sortedJsonStringify,
  stringToUTF8,
  Tx,
  TxFee,
  TxSignature,
} from '@gnolang/tm2-js-client';

import { TransactionFee } from '../../../domain/transaction';
import { GnoMemPackage, GnoMessage, GnoMessageType } from './gno-messages';

const SECP256K1_PUBKEY_TYPE = '/tm.PubKeySecp256k1';
// secp256k1 signatures are r || s, 32 bytes each.
const SECP256K1_SIGNATURE_LENGTH = 64;
// Largest int64, the ceiling tm2 puts on both gas_wanted and coin amounts.
const MAX_INT64 = 9223372036854775807n;

const toMemPackage = (memPackage: GnoMemPackage): MemPackage =>
  MemPackage.create({
    name: memPackage.name,
    path: memPackage.path,
    files: memPackage.files.map(file => MemFile.create({ name: file.name, body: file.body })),
  });

// Field defaults mirror adena-module documentToTx so both wallets produce identical bytes.
export const encodeGnoMessage = (message: GnoMessage): Any => {
  switch (message.type) {
    case GnoMessageType.BANK_MSG_SEND:
      return Any.create({
        type_url: message.type,
        value: MsgSend.encode(MsgSend.create(message.value)).finish(),
      });
    case GnoMessageType.VM_CALL: {
      const { value } = message;
      const msg = MsgCall.create({
        caller: value.caller,
        send: value.send || '',
        max_deposit: value.max_deposit || '',
        pkg_path: value.pkg_path,
        func: value.func,
        args: value.args && value.args.length > 0 ? value.args : undefined,
      });

      return Any.create({ type_url: message.type, value: MsgCall.encode(msg).finish() });
    }

    case GnoMessageType.VM_ADDPKG: {
      const { value } = message;
      const msg = MsgAddPackage.create({
        creator: value.creator,
        send: value.send || '',
        max_deposit: value.max_deposit || '',
        package: toMemPackage(value.package),
      });

      return Any.create({ type_url: message.type, value: MsgAddPackage.encode(msg).finish() });
    }

    case GnoMessageType.VM_RUN: {
      const { value } = message;
      const msg = MsgRun.create({
        caller: value.caller,
        send: value.send || '',
        max_deposit: value.max_deposit || '',
        package: toMemPackage(value.package),
      });

      return Any.create({ type_url: message.type, value: MsgRun.encode(msg).finish() });
    }
  }
};

const toTxFee = (fee: TransactionFee): TxFee =>
  TxFee.create({ gas_wanted: BigInt(fee.gasWanted), gas_fee: fee.gasFee });

export const buildUnsignedGnoTx = (messages: GnoMessage[], fee: TransactionFee, memo: string): Tx =>
  Tx.create({
    messages: messages.map(encodeGnoMessage),
    fee: toTxFee(fee),
    signatures: [],
    memo,
  });

export const buildGnoTxSignature = (publicKey: Uint8Array, signature: Uint8Array): TxSignature =>
  TxSignature.create({
    pub_key: {
      type_url: SECP256K1_PUBKEY_TYPE,
      value: PubKeySecp256k1.encode({ key: publicKey }).finish(),
    },
    signature,
  });

// Same payload as tm2-js-client Wallet.signTransaction, but bound to the caller's chain id
// instead of whatever the RPC reports at signing time.
export const buildGnoSignBytes = (tx: Tx, chainId: string, accountNumber: string, sequence: string): Uint8Array => {
  if (!tx.fee) {
    throw new Error('invalid transaction fee provided');
  }

  const payload = {
    chain_id: chainId,
    account_number: accountNumber,
    sequence,
    fee: { amount: parseSignCoin(tx.fee.gas_fee), gas: tx.fee.gas_wanted.toString(10) },
    msgs: decodeTxMessages(tx.messages),
    memo: tx.memo,
  };

  return stringToUTF8(encodeCharacterSet(sortedJsonStringify(payload)));
};

// Simulation skips signature checks but still matches pub_key against the signer address.
// A zeroed 64-byte signature keeps the tx size (charged as gas) equal to the signed tx.
export const buildSimulationGnoTx = (
  messages: GnoMessage[],
  fee: TransactionFee,
  memo: string,
  publicKey: Uint8Array,
): Tx => ({
  ...buildUnsignedGnoTx(messages, fee, memo),
  signatures: [buildGnoTxSignature(publicKey, new Uint8Array(SECP256K1_SIGNATURE_LENGTH))],
});

// Upper bound on how many bytes the final fee can add over the probe fee once encoded.
export const feeSizeHeadroomBytes = (probeFee: TransactionFee, feeDenom: string): number => {
  const encodedLength = (fee: TransactionFee): number => TxFee.encode(toTxFee(fee)).finish().length;
  const largest = encodedLength({ gasWanted: MAX_INT64.toString(), gasFee: `${MAX_INT64}${feeDenom}` });

  return Math.max(largest - encodedLength(probeFee), 0);
};
