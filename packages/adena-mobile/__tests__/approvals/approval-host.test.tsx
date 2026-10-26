import {RoutePath} from '@types';
import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

import {ApprovalHost} from '../../src/approvals/ApprovalHost';
import type {ApprovalProps} from '../../src/approvals/types';
import {ApprovalQueue} from '../../src/platform/approval-queue';
import {makeDismissedResponse} from '../../src/platform/dismissed-response';

const mockQueue = new ApprovalQueue(makeDismissedResponse);
const mockContext = {platform: {approvals: mockQueue}};
let mockScreen: ApprovalProps | null = null;

jest.mock('../../src/core/wallet-context', () => ({
  useWallet: () => mockContext,
}));
jest.mock('../../src/security/reauth', () => ({ReauthHost: () => null}));
jest.mock('../../src/approvals/TransactionApproval', () => ({
  TransactionApproval: (props: ApprovalProps) => {
    mockScreen = props;
    const {Text} = require('react-native');
    return <Text testID="transaction-screen">transaction</Text>;
  },
}));
jest.mock('../../src/approvals/CosmosApprovals', () => ({
  CosmosSignApproval: () => {
    throw new Error('fee.amount.some is not a function');
  },
}));
jest.mock('../../src/approvals/ConnectApproval', () => ({}));
jest.mock('../../src/approvals/NetworkApproval', () => ({}));
jest.mock('../../src/approvals/SignArbitraryApproval', () => ({}));

const request = (type: string) => ({type, key: `${type}-key`, data: {}} as any);

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];
const render = async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<ApprovalHost />);
  });
  mounted.push(renderer);
  return renderer;
};

const hasText = (renderer: ReactTestRenderer.ReactTestRenderer, text: string) =>
  JSON.stringify(renderer.toJSON()).includes(text);

afterEach(async () => {
  mockScreen = null;
  await act(async () => {
    mounted.splice(0).forEach(renderer => renderer.unmount());
    await mockQueue.dismissAll();
  });
});

describe('ApprovalHost', () => {
  it('keeps a broadcast pending through a lock and never shows it again', async () => {
    const sendResponse = jest.fn();
    await mockQueue.present(
      RoutePath.ApproveTransaction,
      request('DO_CONTRACT'),
      request('close'),
      sendResponse,
    );
    let host = await render();
    const broadcasting = mockScreen!;
    let marked = false;
    await act(async () => {
      marked = broadcasting.markInFlight();
    });
    expect(marked).toBe(true);

    // The wallet locks while the transaction is being sent.
    await act(async () => {
      await mockQueue.dismissAll();
      mounted.splice(mounted.indexOf(host), 1);
      host.unmount();
    });
    expect(broadcasting.signal.aborted).toBe(true);
    expect(sendResponse).not.toHaveBeenCalled();

    // Unlocked again before the network answered.
    mockScreen = null;
    host = await render();
    expect(mockScreen).toBeNull();
    expect(hasText(host, 'Sending Transaction')).toBe(true);

    // The broadcast started before the lock answers the page.
    const success = {status: 'success', key: 'DO_CONTRACT-key'} as any;
    await act(async () => broadcasting.respond(success));
    expect(sendResponse).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith(success);
    expect(host.toJSON()).toBeNull();
  });

  it('fails a request whose screen cannot render instead of crashing', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const sendResponse = jest.fn();
    await mockQueue.present(
      RoutePath.ApproveSignCosmos,
      request('SIGN_COSMOS_AMINO'),
      request('close'),
      sendResponse,
    );
    const host = await render();

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({code: 9000, key: 'SIGN_COSMOS_AMINO-key'}),
    );
    expect(mockQueue.current()).toBeNull();
    expect(host.toJSON()).toBeNull();
    error.mockRestore();
  });
});
