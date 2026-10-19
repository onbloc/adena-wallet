import {makeDismissedResponse} from '../../src/platform/dismissed-response';

describe('makeDismissedResponse', () => {
  it('matches the SDK UNEXPECTED_ERROR failure that the extension sends', () => {
    const {WalletMessageInfo} = jest.requireActual('@adena-wallet/sdk');
    const response = makeDismissedResponse({key: 'request-1'} as any) as any;

    expect(response).toEqual({
      ...WalletMessageInfo.UNEXPECTED_ERROR,
      data: {},
      key: 'request-1',
    });
  });
});
