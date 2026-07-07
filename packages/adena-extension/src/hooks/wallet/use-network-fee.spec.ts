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
import {
  useGetDefaultEstimateGasInfo,
  useGetEstimateGasInfo,
} from './transaction-gas/use-get-estimate-gas-info';
import { useGetEstimateGasPriceTiers } from './transaction-gas/use-get-estimate-gas-price-tiers';
import { useNetworkFee } from './use-network-fee';

jest.mock('./transaction-gas/use-get-estimate-gas-info', () => ({
  useGetDefaultEstimateGasInfo: jest.fn(),
  useGetEstimateGasInfo: jest.fn(),
}));

jest.mock('./transaction-gas/use-get-estimate-gas-price-tiers', () => ({
  useGetEstimateGasPriceTiers: jest.fn(),
}));

const useGetDefaultEstimateGasInfoMock = useGetDefaultEstimateGasInfo as jest.Mock;
const useGetEstimateGasInfoMock = useGetEstimateGasInfo as jest.Mock;
const useGetEstimateGasPriceTiersMock = useGetEstimateGasPriceTiers as jest.Mock;

describe('useNetworkFee', () => {
  beforeEach(() => {
    useGetDefaultEstimateGasInfoMock.mockReset();
    useGetEstimateGasInfoMock.mockReset();
    useGetEstimateGasPriceTiersMock.mockReset();

    useGetDefaultEstimateGasInfoMock.mockReturnValue({ data: undefined, isFetched: false });
    useGetEstimateGasInfoMock.mockReturnValue({ data: undefined, isFetched: false });
    useGetEstimateGasPriceTiersMock.mockReturnValue({ data: undefined, isFetched: false });
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

  it('disables estimate queries and uses document fee for session admin messages', () => {
    const document = makeDocument([MSG_CREATE_SESSION_ENDPOINT]);

    const { result } = renderHook(() => useNetworkFee(document));

    expect(useGetDefaultEstimateGasInfoMock).toHaveBeenCalledWith(
      document,
      expect.objectContaining({ enabled: false }),
    );
    expect(useGetEstimateGasInfoMock).toHaveBeenCalledWith(
      document,
      0,
      expect.objectContaining({ enabled: false }),
    );
    expect(useGetEstimateGasPriceTiersMock).toHaveBeenCalledWith(
      document,
      undefined,
      expect.any(String),
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

  it('keeps normal estimate queries enabled by hook defaults for other messages', () => {
    const document = makeDocument(['/bank.MsgSend']);
    const gasInfo = {
      gasFee: 123,
      gasPrice: 1,
      gasUsed: 123,
      gasWanted: 123,
      hasError: false,
      simulateErrorMessage: null,
    };
    useGetDefaultEstimateGasInfoMock.mockReturnValue({ data: gasInfo, isFetched: true });
    useGetEstimateGasInfoMock.mockReturnValue({ data: gasInfo, isFetched: true });
    useGetEstimateGasPriceTiersMock.mockReturnValue({
      data: [
        {
          settingType: NetworkFeeSettingType.AVERAGE,
          gasInfo,
          storageDeposits: {
            storageDeposit: 0,
            unlockDeposit: 0,
            storageUsage: 0,
            releaseStorageUsage: 0,
          },
        },
      ],
      isFetched: true,
    });

    const { result } = renderHook(() => useNetworkFee(document));

    expect(useGetDefaultEstimateGasInfoMock).toHaveBeenCalledWith(document, undefined);
    expect(useGetEstimateGasInfoMock).toHaveBeenCalledWith(document, 123, undefined);
    expect(useGetEstimateGasPriceTiersMock).toHaveBeenCalledWith(
      document,
      123,
      expect.any(String),
      undefined,
    );
    expect(result.current.currentGasInfo).toEqual(gasInfo);
    expect(result.current.isSimulateError).toBe(false);
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
