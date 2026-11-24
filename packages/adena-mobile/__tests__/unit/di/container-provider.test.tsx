import { renderHook } from '@testing-library/react-native';
import React, { PropsWithChildren } from 'react';

import { AppContainer } from '../../../src/di/container';
import { ContainerProvider, useContainer } from '../../../src/di/container-provider';

describe('ContainerProvider / useContainer', () => {
  it('provides the container to descendants', async () => {
    const container = { marker: true } as unknown as AppContainer;
    const wrapper = ({ children }: PropsWithChildren) => <ContainerProvider container={container}>{children}</ContainerProvider>;
    const { result } = await renderHook(() => useContainer(), { wrapper });

    expect(result.current).toBe(container);
  });

  it('throws outside a provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useContainer())).rejects.toThrow('useContainer must be used inside ContainerProvider');
    spy.mockRestore();
  });
});
