import { JSONRPCProvider, Provider } from '@gnolang/tm2-js-client';
import { AdenaWallet, Document, txToDocument } from './..';

const mnemonic =
  'source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast';

function makeDocument(body: string): Document {
  return {
    msgs: [
      {
        type: '/vm.m_addpkg',
        value: {
          creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
          deposit: '1ugnot',
          package: {
            Name: 'hello',
            Path: 'gno.land/r/demo/hello',
            Files: [
              {
                Name: 'hello.gno',
                Body: body,
              },
            ],
          },
        },
      },
    ],
    fee: {
      amount: [
        {
          amount: '1',
          denom: 'ugnot',
        },
      ],
      gas: '5000000',
    },
    chain_id: 'dev',
    memo: '',
    account_number: '0',
    sequence: '1',
  };
}

describe('Transaction Sign', () => {
  let mockProvider: Provider;

  beforeEach(() => {
    mockProvider = new JSONRPCProvider('');
    mockProvider.getStatus = jest.fn().mockResolvedValue('0');
    mockProvider.getStatus = jest.fn().mockResolvedValue({
      node_info: {
        node_info: 'dev',
      },
    });
    mockProvider.getAccountNumber = jest.fn().mockResolvedValue('0');
    mockProvider.getAccountSequence = jest.fn().mockResolvedValue('1');
  });

  it('default success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n// test\n';
    const document = makeDocument(body);
    const { signed, signature } = await wallet.sign(mockProvider, document);

    const signedTx = txToDocument(signed);
    console.log(signedTx);
    expect(signature).toHaveLength(1);
  });

  it('"&" includes success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n\nfunc main() {\n    // &\n}\n';
    const document = makeDocument(body);
    const signature = await wallet.sign(mockProvider, document);

    expect(signature.signature).toHaveLength(1);
  });

  it('">" includes success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n\nfunc main() {\n    // >\n}\n';
    const document = makeDocument(body);
    const signature = await wallet.sign(mockProvider, document);

    expect(signature.signature).toHaveLength(1);
  });

  it('"<" includes success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n\nfunc main() {\n    // <\n}\n';
    const document = makeDocument(body);
    const signature = await wallet.sign(mockProvider, document);

    expect(signature.signature).toHaveLength(1);
  });
});
