import { renderHook } from '@testing-library/react';
import {
  Document,
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
  MSG_REVOKE_SESSION_ENDPOINT,
} from 'adena-module';
import { NetworkFeeSettingType } from '@types';
import {
  isStaticSessionAdminFeeDocument,
  makeStaticSessionAdminFeeSettings,
} from './transaction-gas/session-admin-static-fee';
import { useGetEstimateGas } from './transaction-gas/use-get-estimate-gas';
import { useGetGasPrice } from './transaction-gas/use-get-gas-price';
import { useNetworkFee } from './use-network-fee';

jest.mock('./transaction-gas/use-get-estimate-gas', () => ({
  useGetEstimateGas: jest.fn(),
}));

jest.mock('./transaction-gas/use-get-gas-price', () => ({
  useGetGasPrice: jest.fn(),
}));

const useGetEstimateGasMock = useGetEstimateGas as jest.Mock;
const useGetGasPriceMock = useGetGasPrice as jest.Mock;

const EMPTY_STORAGE_DEPOSITS = {
  storageDeposit: 0,
  unlockDeposit: 0,
  storageUsage: 0,
  releaseStorageUsage: 0,
};

describe('useNetworkFee', () => {
  beforeEach(() => {
    useGetEstimateGasMock.mockReset();
    useGetGasPriceMock.mockReset();

    useGetEstimateGasMock.mockReturnValue({ data: undefined, isFetched: false });
    useGetGasPriceMock.mockReturnValue({ data: null, isFetched: false });
  });

  it('builds static fee settings for session admin messages', () => {
    const document = makeDocument([
      MSG_CREATE_SESSION_ENDPOINT,
      MSG_REVOKE_SESSION_ENDPOINT,
      MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
    ]);

    expect(isStaticSessionAdminFeeDocument(document)).toBe(true);
    expect(makeStaticSessionAdminFeeSettings(document)).toEqual([
      expect.objectContaining({
        settingType: NetworkFeeSettingType.FAST,
        gasInfo: expect.objectContaining({ gasFee: 5_000_000, gasWanted: 1_000_000 }),
      }),
      expect.objectContaining({
        settingType: NetworkFeeSettingType.AVERAGE,
        gasInfo: expect.objectContaining({ gasFee: 5_000_000, gasWanted: 1_000_000 }),
      }),
      expect.objectContaining({
        settingType: NetworkFeeSettingType.SLOW,
        gasInfo: expect.objectContaining({ gasFee: 5_000_000, gasWanted: 1_000_000 }),
      }),
    ]);
  });

  it('does not use static fee settings for mixed messages', () => {
    const document = makeDocument([MSG_CREATE_SESSION_ENDPOINT, '/bank.MsgSend']);

    expect(isStaticSessionAdminFeeDocument(document)).toBe(false);
    expect(makeStaticSessionAdminFeeSettings(document)).toBeNull();
  });

  it('recognizes session admin messages with alternate type keys', () => {
    const document = makeDocumentFromMessages([
      { '@type': MSG_CREATE_SESSION_ENDPOINT, value: {} },
      { type_url: MSG_REVOKE_SESSION_ENDPOINT, value: {} },
      { typeUrl: MSG_REVOKE_ALL_SESSIONS_ENDPOINT, value: {} },
    ]);

    expect(isStaticSessionAdminFeeDocument(document)).toBe(true);
  });

  it('disables the estimate query and uses document fee for session admin messages', () => {
    const document = makeDocument([MSG_CREATE_SESSION_ENDPOINT]);

    const { result } = renderHook(() => useNetworkFee(document));

    expect(useGetEstimateGasMock).toHaveBeenCalledWith(
      document,
      expect.objectContaining({ enabled: false }),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSimulateError).toBe(false);
    expect(result.current.currentGasInfo).toEqual(
      expect.objectContaining({
        gasFee: 5_000_000,
        gasUsed: 1_000_000,
        gasWanted: 1_000_000,
        hasError: false,
      }),
    );
    expect(result.current.currentGasFeeRawAmount).toBe(5_000_000);
  });

  it('derives tiers arithmetically from a single simulate result for other messages', () => {
    const document = makeDocument(['/bank.MsgSend']);
    useGetEstimateGasMock.mockReturnValue({
      data: {
        gasUsed: 123,
        storageDeposits: EMPTY_STORAGE_DEPOSITS,
        hasError: false,
        simulateErrorMessage: null,
      },
      isFetched: true,
    });
    useGetGasPriceMock.mockReturnValue({ data: 1, isFetched: true });

    const { result } = renderHook(() => useNetworkFee(document));

    expect(useGetEstimateGasMock).toHaveBeenCalledWith(document, undefined);
    // AVERAGE tier: floor(123 * 1.1 * 1) = 135, gasFee = ceil(1 * 135) = 135
    expect(result.current.currentGasInfo).toEqual({
      gasFee: 135,
      gasUsed: 135,
      gasWanted: 135,
      gasPrice: 1,
      hasError: false,
      simulateErrorMessage: null,
    });
    expect(result.current.isSimulateError).toBe(false);
    expect(result.current.networkFeeSettings).toHaveLength(3);
  });

  it('flags simulate errors coming from the estimate result', () => {
    const document = makeDocument(['/bank.MsgSend']);
    useGetEstimateGasMock.mockReturnValue({
      data: {
        gasUsed: 0,
        storageDeposits: EMPTY_STORAGE_DEPOSITS,
        hasError: true,
        simulateErrorMessage: 'simulate failed',
      },
      isFetched: true,
    });
    useGetGasPriceMock.mockReturnValue({ data: 1, isFetched: true });

    const { result } = renderHook(() => useNetworkFee(document));

    expect(result.current.isSimulateError).toBe(true);
    expect(result.current.currentGasInfo?.hasError).toBe(true);
    expect(result.current.currentGasInfo?.simulateErrorMessage).toBe('simulate failed');
  });
});

function makeDocument(messageTypes: string[]): Document {
  return makeDocumentFromMessages(messageTypes.map((type) => ({ type, value: {} })));
}

function makeDocumentFromMessages(messages: unknown[]): Document {
  return {
    msgs: messages as Document['msgs'],
    fee: {
      gas: '1000000',
      amount: [{ denom: 'ugnot', amount: '5000000' }],
    },
    memo: '',
    chain_id: 'test-13',
    account_number: '1',
    sequence: '1',
  } as Document;
}
