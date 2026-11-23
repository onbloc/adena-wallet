import { Any, MemFile, MemPackage, MsgAddPackage, MsgCall, MsgRun, MsgSend } from '@gnolang/gno-js-client';
import { PubKeySecp256k1, Tx, TxFee, TxSignature } from '@gnolang/tm2-js-client';

import { TransactionFee } from '../../../domain/transaction';
import { GnoMemPackage, GnoMessage, GnoMessageType } from './gno-messages';

const SECP256K1_PUBKEY_TYPE = '/tm.PubKeySecp256k1';

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

// Simulation skips signature checks but still matches pub_key against the signer address.
export const buildSimulationGnoTx = (
  messages: GnoMessage[],
  fee: TransactionFee,
  memo: string,
  publicKey: Uint8Array,
): Tx => {
  const signature = TxSignature.create({
    pub_key: {
      type_url: SECP256K1_PUBKEY_TYPE,
      value: PubKeySecp256k1.encode({ key: publicKey }).finish(),
    },
    signature: new Uint8Array(),
  });

  return { ...buildUnsignedGnoTx(messages, fee, memo), signatures: [signature] };
};
