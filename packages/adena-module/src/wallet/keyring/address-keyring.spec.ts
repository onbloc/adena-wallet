import { Tx, uint8ArrayToBase64 } from '@gnolang/tm2-js-client';
import { strToSignedTx } from '../../utils';
import { AddressKeyring } from './address-keyring';

describe('create address keyring', () => {
  it('create address keyring from address', async () => {
    const address = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
    const addressKeyring = await AddressKeyring.fromAddress(address);

    expect(addressKeyring.id).not.toBeNull();
    expect([...addressKeyring.addressBytes]).toStrictEqual([
      146, 15, 181, 241, 124, 45, 175, 116, 187, 21, 153, 183, 203, 224, 41, 90, 94, 30, 201, 183,
    ]);
    expect(addressKeyring.type.toString()).toBe('AIRGAP');
  });
});

describe('tx encode of address keyring', () => {
  it('str to signedTx', async () => {
    const str =
      '{"msg":[{"@type":"/vm.m_call","caller":"g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5","send":"","pkg_path":"gno.land/r/demo/tong","func":"Transfer","args":["g1kcdd3n0d472g2p5l8svyg9t0wq6h5857nq992f","1"]}],"fee":{"gas_wanted":"9000000","gas_fee":"1ugnot"},"signatures":[{"pub_key":{"@type":"/tm.PubKeySecp256k1","value":"A+FhNtsXHjLfSJk1lB8FbiL4mGPjc50Kt81J7EKDnJ2y"},"signature":"6Jk3gs564wGTutNdODztNUlg88/WHmMPmJGRZHDuV00Mc9M5gGWBZDEpGysLsqzjMDxmsTu1PLtTYfTj0KphGQ=="}],"memo":""}';
    const signedTx = strToSignedTx(str)!;
    const expectedResult = {
      messages: [
        {
          typeUrl: '/vm.m_call',
          value: new Uint8Array([
            10, 40, 103, 49, 106, 103, 56, 109, 116, 117, 116, 117, 57, 107, 104, 104, 102, 119, 99,
            52, 110, 120, 109, 117, 104, 99, 112, 102, 116, 102, 48, 112, 97, 106, 100, 104, 102,
            118, 115, 113, 102, 53, 26, 20, 103, 110, 111, 46, 108, 97, 110, 100, 47, 114, 47, 100,
            101, 109, 111, 47, 116, 111, 110, 103, 34, 8, 84, 114, 97, 110, 115, 102, 101, 114, 42,
            40, 103, 49, 107, 99, 100, 100, 51, 110, 48, 100, 52, 55, 50, 103, 50, 112, 53, 108, 56,
            115, 118, 121, 103, 57, 116, 48, 119, 113, 54, 104, 53, 56, 53, 55, 110, 113, 57, 57,
            50, 102, 42, 1, 49,
          ]),
        },
      ],
      fee: {
        gasWanted: {
          low: 9000000,
          high: 0,
          unsigned: false,
        },
        gasFee: '1ugnot',
      },
      signatures: [
        {
          pubKey: {
            typeUrl: '/tm.PubKeySecp256k1',
            value: new Uint8Array([
              3, 225, 97, 54, 219, 23, 30, 50, 223, 72, 153, 53, 148, 31, 5, 110, 34, 248, 152, 99,
              227, 115, 157, 10, 183, 205, 73, 236, 66, 131, 156, 157, 178,
            ]),
          },
          signature: new Uint8Array([
            232, 153, 55, 130, 206, 122, 227, 1, 147, 186, 211, 93, 56, 60, 237, 53, 73, 96, 243,
            207, 214, 30, 99, 15, 152, 145, 145, 100, 112, 238, 87, 77, 12, 115, 211, 57, 128, 101,
            129, 100, 49, 41, 27, 43, 11, 178, 172, 227, 48, 60, 102, 177, 59, 181, 60, 187, 83, 97,
            244, 227, 208, 170, 97, 25,
          ]),
        },
      ],
      memo: '',
    };

    expect(signedTx.messages.length).toBe(expectedResult.messages.length);
    expect(signedTx.signatures.length).toBe(expectedResult.signatures.length);
  });

  it('str to base64', async () => {
    const str =
      '{"msg":[{"@type":"/vm.m_call","caller":"g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5","send":"","pkg_path":"gno.land/r/demo/tong","func":"Transfer","args":["g1kcdd3n0d472g2p5l8svyg9t0wq6h5857nq992f","1"]}],"fee":{"gas_wanted":"9000000","gas_fee":"1ugnot"},"signatures":[{"pub_key":{"@type":"/tm.PubKeySecp256k1","value":"A+FhNtsXHjLfSJk1lB8FbiL4mGPjc50Kt81J7EKDnJ2y"},"signature":"6Jk3gs564wGTutNdODztNUlg88/WHmMPmJGRZHDuV00Mc9M5gGWBZDEpGysLsqzjMDxmsTu1PLtTYfTj0KphGQ=="}],"memo":""}';
    const signedTx = strToSignedTx(str)!;
    const encodedTx = uint8ArrayToBase64(Tx.encode(signedTx).finish());

    expect(encodedTx).toBe(
      'CoUBCgovdm0ubV9jYWxsEncKKGcxamc4bXR1dHU5a2hoZndjNG54bXVoY3BmdGYwcGFqZGhmdnNxZjUiFGduby5sYW5kL3IvZGVtby90b25nKghUcmFuc2ZlcjIoZzFrY2RkM24wZDQ3MmcycDVsOHN2eWc5dDB3cTZoNTg1N25xOTkyZjIBMRINCIDRyggSBjF1Z25vdBp+CjoKEy90bS5QdWJLZXlTZWNwMjU2azESIwohA+FhNtsXHjLfSJk1lB8FbiL4mGPjc50Kt81J7EKDnJ2yEkDomTeCznrjAZO60104PO01SWDzz9YeYw+YkZFkcO5XTQxz0zmAZYFkMSkbKwuyrOMwPGaxO7U8u1Nh9OPQqmEZ',
    );
  });
});
