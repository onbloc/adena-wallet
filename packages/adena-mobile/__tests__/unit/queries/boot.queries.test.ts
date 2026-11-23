import { renderHook, waitFor } from '@testing-library/react-native';

import { createNativeContainer } from '../../../src/di/create-native-container';
import { useNativeContainerQuery } from '../../../src/queries/boot.queries';
import { queryKeys } from '../../../src/queries/query-keys';
import { createWrapper } from '../../helpers/query-wrapper';

jest.mock('../../../src/di/create-native-container', () => ({ createNativeContainer: jest.fn() }));

const createMock = createNativeContainer as jest.MockedFunction<typeof createNativeContainer>;

describe('useNativeContainerQuery', () => {
  beforeEach(() => createMock.mockReset());

  it('builds the container once and caches it forever', async () => {
    const container = { id: 'container' } as never;
    const { Wrapper, client } = createWrapper({});

    createMock.mockResolvedValue(container);

    const { result } = await renderHook(() => useNativeContainerQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(container);
    expect(client.getQueryCache().find({ queryKey: queryKeys.boot() })?.options).toMatchObject({ staleTime: Infinity, gcTime: Infinity, retry: false });
  });

  it('surfaces boot failures without retrying', async () => {
    const { Wrapper } = createWrapper({});

    createMock.mockRejectedValue(new Error('keychain locked'));

    const { result } = await renderHook(() => useNativeContainerQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('keychain locked');
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
