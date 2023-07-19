import { AdenaWallet } from '.';

const mnemonic =
  'source bonus chronic canvas draft south burst lottery vacant surface solve popular case indicate oppose farm nothing bullet exhibit title speed wink action roast';

function makeDocument(body: string) {
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
  it('default success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n// test\n';
    const documnet = makeDocument(body);
    const signature = await wallet.sign(documnet);

    expect(signature.signature.signature).toBe(
      'NN3EWlM/M4bnkQlJtBTp6lDqcY3UsWlDuDdl3NKFtDRztl/hVyyg4sjaBZiYZoq6kjCAeLj5j5aqyETGr5PhiA==',
    );
  });

  it('"&" includes success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n\nfunc main() {\n    // &\n}\n';
    const documnet = makeDocument(body);
    const signature = await wallet.sign(documnet);

    expect(signature.signature.signature).toBe(
      'fwoe2djDbqcNl0Nw0tPSIUJbij/+rzflTW50lbvWXOgog9hDr+LCZgnJroAyo/QcDo8O1t/l5PhCcxZldPLJow==',
    );
  });

  it('">" includes success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n\nfunc main() {\n    // >\n}\n';
    const documnet = makeDocument(body);
    const signature = await wallet.sign(documnet);

    expect(signature.signature.signature).toBe(
      '5H5Dx+7g+m92T6+eSO+DTBYVWr7Wq/ok0mrgPuvuwxUKikBLkAQrS4aGx79sxv8lpxAfFCIFdZYk/pW7+vpB1Q==',
    );
  });

  it('"<" includes success', async () => {
    const wallet = await AdenaWallet.createByMnemonic(mnemonic);
    const body = 'package hello\n\nfunc main() {\n    // <\n}\n';
    const documnet = makeDocument(body);
    const signature = await wallet.sign(documnet);

    expect(signature.signature.signature).toBe(
      'RxjoXe8NwW+89vKNntbuEJ6ZvVBdytWCSbqfy7TtIztXpmcGDoPbWDIvOIZfZWKe2BJDG06MzvXd8Y8LvecKYg==',
    );
  });
});
