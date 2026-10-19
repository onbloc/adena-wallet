import {GenericAuthorization} from 'cosmjs-types/cosmos/authz/v1beta1/authz';
import {MsgGrant} from 'cosmjs-types/cosmos/authz/v1beta1/tx';
import {MsgSend} from 'cosmjs-types/cosmos/bank/v1beta1/tx';
import {AuthInfo, TxBody} from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import {
  classifyCosmosSigningRisk,
  formatCoin,
  summarizeAminoSignDoc,
  summarizeDirectSignDoc,
} from '../../src/core/cosmos-messages';

const ME = 'atone1me';
const OTHER = 'atone1other';
const SEND_AUTHZ = '/cosmos.bank.v1beta1.MsgSend';

const aminoDoc = (msgs: {type: string; value: any}[], fee = '5000') => ({
  chain_id: 'atomone-1',
  account_number: '0',
  sequence: '0',
  fee: {amount: [{denom: 'uphoton', amount: fee}], gas: '200000'},
  msgs,
  memo: 'hi',
});

const rowsOf = (message: {rows: {label: string; value: string}[]}) =>
  Object.fromEntries(message.rows.map(row => [row.label, row.value]));

describe('formatCoin', () => {
  it('shows micro denoms in whole tokens next to the raw amount', () => {
    expect(formatCoin({denom: 'uatone', amount: '5000000000'})).toBe(
      '5000 ATONE (5000000000 uatone)',
    );
    expect(formatCoin({denom: 'uphoton', amount: '1500'})).toBe(
      '0.0015 PHOTON (1500 uphoton)',
    );
    expect(formatCoin({denom: 'ibc/ABC', amount: '7'})).toBe('7 ibc/ABC');
  });
});

describe('amino sign requests', () => {
  it('shows the recipient, the amount and the grant of a send + authz request', () => {
    const summary = summarizeAminoSignDoc(
      aminoDoc([
        {
          type: 'cosmos-sdk/MsgSend',
          value: {
            from_address: ME,
            to_address: OTHER,
            amount: [{denom: 'uatone', amount: '5000000000'}],
          },
        },
        {
          type: 'cosmos-sdk/MsgGrant',
          value: {
            granter: ME,
            grantee: OTHER,
            grant: {
              authorization: {
                type: 'cosmos-sdk/GenericAuthorization',
                value: {msg: SEND_AUTHZ},
              },
            },
          },
        },
      ]) as any,
    );
    expect(rowsOf(summary.messages[0])).toEqual({
      From: ME,
      To: OTHER,
      Amount: '5000 ATONE (5000000000 uatone)',
    });
    expect(summary.messages[1].title).toBe('Grant permission (authz)');
    expect(rowsOf(summary.messages[1])).toMatchObject({
      Grantee: OTHER,
      'Allowed message': SEND_AUTHZ,
      Expires: 'Never',
    });
    expect(classifyCosmosSigningRisk(summary)).toEqual({
      level: 'high',
      codes: ['AUTHZ_GRANT'],
    });
  });

  it('treats unknown messages and empty requests as high risk', () => {
    const unknown = summarizeAminoSignDoc(
      aminoDoc([{type: 'atomone/MsgSomething', value: {}}]) as any,
    );
    expect(unknown.messages[0].title).toBeNull();
    expect(classifyCosmosSigningRisk(unknown).codes).toEqual([
      'UNKNOWN_MESSAGE',
    ]);
    expect(
      classifyCosmosSigningRisk(summarizeAminoSignDoc(aminoDoc([]) as any)),
    ).toMatchObject({level: 'high', codes: ['NO_MESSAGES']});
  });

  it('flags a fee of a whole token or more', () => {
    const send = {
      type: 'cosmos-sdk/MsgSend',
      value: {from_address: ME, to_address: OTHER, amount: []},
    };
    expect(
      classifyCosmosSigningRisk(summarizeAminoSignDoc(aminoDoc([send]) as any)),
    ).toEqual({level: 'low', codes: []});
    expect(
      classifyCosmosSigningRisk(
        summarizeAminoSignDoc(aminoDoc([send], '2000000') as any),
      ),
    ).toEqual({level: 'medium', codes: ['HIGH_FEE']});
  });
});

describe('DIRECT sign requests', () => {
  it('decodes the protobuf body instead of showing nothing', () => {
    const bodyBytes = TxBody.encode(
      TxBody.fromPartial({
        memo: 'direct',
        messages: [
          {
            typeUrl: '/cosmos.bank.v1beta1.MsgSend',
            value: MsgSend.encode(
              MsgSend.fromPartial({
                fromAddress: ME,
                toAddress: OTHER,
                amount: [{denom: 'uatone', amount: '1000000'}],
              }),
            ).finish(),
          },
          {
            typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
            value: MsgGrant.encode(
              MsgGrant.fromPartial({
                granter: ME,
                grantee: OTHER,
                grant: {
                  authorization: {
                    typeUrl: '/cosmos.authz.v1beta1.GenericAuthorization',
                    value: GenericAuthorization.encode({
                      msg: SEND_AUTHZ,
                    }).finish(),
                  },
                },
              }),
            ).finish(),
          },
        ],
      }),
    ).finish();
    const authInfoBytes = AuthInfo.encode(
      AuthInfo.fromPartial({
        fee: {amount: [{denom: 'uphoton', amount: '3000'}], gasLimit: 1n},
      }),
    ).finish();

    const summary = summarizeDirectSignDoc({bodyBytes, authInfoBytes});
    expect(summary.memo).toBe('direct');
    expect(summary.fee).toEqual([{denom: 'uphoton', amount: '3000'}]);
    expect(rowsOf(summary.messages[0])).toEqual({
      From: ME,
      To: OTHER,
      Amount: '1 ATONE (1000000 uatone)',
    });
    expect(rowsOf(summary.messages[1])).toMatchObject({
      Grantee: OTHER,
      Permission: '/cosmos.authz.v1beta1.GenericAuthorization',
      'Allowed message': SEND_AUTHZ,
    });
    expect(classifyCosmosSigningRisk(summary).level).toBe('high');
  });
});
