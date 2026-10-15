jest.mock('@adena-wallet/sdk', () => ({
  WalletResponseFailureType: { NOT_CONNECTED: 'NOT_CONNECTED', UNEXPECTED_ERROR: 'UNEXPECTED_ERROR' },
}));

import {
  ApprovalPresenter,
  chromeApprovalPresenter,
  getApprovalPresenter,
  setApprovalPresenter,
} from './approval-presenter';
import { createPopup, existsPopups, removePopups } from './methods/common';

describe('ApprovalPresenter seam', () => {
  afterEach(() => setApprovalPresenter(chromeApprovalPresenter));

  it('defaults to the chrome popup implementation', () => {
    expect(getApprovalPresenter()).toBe(chromeApprovalPresenter);
  });

  it('routes the popup helpers through the registered presenter', async () => {
    const calls: string[] = [];
    const presenter: ApprovalPresenter = {
      present: async (path, message, _closeMessage, sendResponse) => {
        calls.push(`present:${path}`);
        sendResponse(message);
      },
      hasOpenApprovals: async () => {
        calls.push('has');
        return true;
      },
      dismissAll: async () => {
        calls.push('dismiss');
      },
    };
    setApprovalPresenter(presenter);

    const responses: unknown[] = [];
    const request = { key: 'k1' } as any;
    await createPopup('/approve-sign', request, { key: 'k1' } as any, (r) => responses.push(r));

    expect(await existsPopups()).toBe(true);
    await removePopups();
    expect(calls).toEqual(['present:/approve-sign', 'has', 'dismiss']);
    expect(responses).toEqual([request]);
  });
});
