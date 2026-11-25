import { renderHook } from '@testing-library/react-native';
import React, { PropsWithChildren, ReactElement } from 'react';

import { ColorScheme } from '../../../src/domain/preferences';
import { darkColors, lightColors, makeStyles, useThemeColors } from '../../../src/theme';
import { SchemeWrapper } from '../../helpers/theme';

const wrapperFor = (scheme: ColorScheme) => ({ children }: PropsWithChildren): ReactElement => <SchemeWrapper scheme={scheme}>{children}</SchemeWrapper>;

describe('useThemeColors', () => {
  it('defaults to the light tokens outside the app shell', async () => {
    const { result } = await renderHook(() => useThemeColors());

    expect(result.current).toBe(lightColors);
  });

  it('returns the dark tokens for the dark scheme', async () => {
    const { result } = await renderHook(() => useThemeColors(), { wrapper: wrapperFor('dark') });

    expect(result.current).toBe(darkColors);
  });
});

describe('makeStyles', () => {
  it('builds each scheme once and reuses it across renders', async () => {
    const factory = jest.fn((colors: typeof lightColors) => ({ root: { backgroundColor: colors.background.canvas, padding: 4 } }));
    const useStyles = makeStyles(factory);

    const light = await renderHook(() => useStyles());
    const dark = await renderHook(() => useStyles(), { wrapper: wrapperFor('dark') });
    const darkAgain = await renderHook(() => useStyles(), { wrapper: wrapperFor('dark') });

    expect(light.result.current.root).toEqual({ backgroundColor: lightColors.background.canvas, padding: 4 });
    expect(dark.result.current.root).toEqual({ backgroundColor: darkColors.background.canvas, padding: 4 });
    expect(darkAgain.result.current).toBe(dark.result.current);
    expect(factory).toHaveBeenCalledTimes(2);
  });
});
