import { Document } from 'adena-module';

import {
  resolveCodeMessageGasType,
  resolveStaticCodeMessageGasUsed,
  STATIC_CODE_MESSAGE_GAS_USED,
} from './code-message-static-gas';

function makeDocument(msgs: Document['msgs']): Document {
  return {
    msgs,
    fee: { gas: '200000', amount: [{ denom: 'ugnot', amount: '1000' }] },
    memo: '',
    chain_id: 'pearl-1',
    account_number: '0',
    sequence: '0',
  };
}

const grc20TransferRun = {
  type: '/vm.m_run',
  value: {
    caller: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
    package: {
      name: 'main',
      path: '',
      files: [
        {
          name: 'main.gno',
          body: 'package main\n\nfunc main(cur realm) {\n\tgrc20reg.Transfer(0, cur, "k", address("g1"), 1)\n}\n',
        },
      ],
    },
  },
};

const plainRun = {
  type: '/vm.m_run',
  value: {
    caller: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
    package: {
      name: 'main',
      path: '',
      files: [{ name: 'main.gno', body: 'package main\n\nfunc main(cur realm) {}\n' }],
    },
  },
};

const addPackage = {
  type: '/vm.m_addpkg',
  value: { creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5' },
};

const bankSend = {
  type: '/bank.MsgSend',
  value: { from_address: 'g1', to_address: 'g2', amount: '1ugnot' },
};

describe('resolveCodeMessageGasType', () => {
  it('separates a GRC20 transfer run from a plain run', () => {
    expect(resolveCodeMessageGasType(grc20TransferRun)).toBe('MSG_RUN_GRC20_TRANSFER');
    expect(resolveCodeMessageGasType(plainRun)).toBe('MSG_RUN');
  });

  it('classifies add package and ignores non code-bearing messages', () => {
    expect(resolveCodeMessageGasType(addPackage)).toBe('ADD_PACKAGE');
    expect(resolveCodeMessageGasType(bankSend)).toBeNull();
  });
});

describe('resolveStaticCodeMessageGasUsed', () => {
  it('returns null when no message carries code', () => {
    expect(resolveStaticCodeMessageGasUsed(makeDocument([bankSend]))).toBeNull();
  });

  it('sums the buckets of every code-bearing message', () => {
    expect(resolveStaticCodeMessageGasUsed(makeDocument([grc20TransferRun]))).toBe(
      STATIC_CODE_MESSAGE_GAS_USED.MSG_RUN_GRC20_TRANSFER,
    );
    expect(resolveStaticCodeMessageGasUsed(makeDocument([addPackage, plainRun]))).toBe(
      STATIC_CODE_MESSAGE_GAS_USED.ADD_PACKAGE + STATIC_CODE_MESSAGE_GAS_USED.MSG_RUN,
    );
  });
});
