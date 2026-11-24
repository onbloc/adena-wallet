import { act, render, screen } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { Text } from 'react-native';

import { AppThemeProvider } from '../../../src/app/app-theme-provider';
import { resolveColorScheme } from '../../../src/domain/preferences';
import { useAppTheme } from '../../../src/hooks/use-app-theme';
import { StoragePreferenceRepository } from '../../../src/repositories/preference.repository';
import { PreferenceService } from '../../../src/services/preference.service';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { createWrapper } from '../../helpers/query-wrapper';

const Probe = (): ReactElement => {
  const { preference, scheme } = useAppTheme();

  return <Text testID='theme'>{`${preference}:${scheme}`}</Text>;
};

let mockColorScheme: 'light' | 'dark' | null = 'light';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: () => mockColorScheme }));

// The real status bar renders nothing; this stand-in exposes the requested style.
jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => {
  const { Text: MockText } = jest.requireActual('react-native');

  return { __esModule: true, default: ({ barStyle }: { barStyle: string }) => <MockText testID='status-bar'>{barStyle}</MockText> };
});

const statusBarStyle = (): string => screen.getByTestId('status-bar').props.children;

describe('resolveColorScheme', () => {
  it.each([
    ['system', 'dark', 'dark'],
    ['system', 'light', 'light'],
    ['system', null, 'light'],
    ['system', 'unspecified', 'light'],
    ['light', 'dark', 'light'],
    ['dark', 'light', 'dark'],
  ] as const)('%s with OS %p resolves to %s', (preference, system, expected) => {
    expect(resolveColorScheme(preference, system)).toBe(expected);
  });
});

describe('AppThemeProvider', () => {
  let preferenceService: PreferenceService;

  beforeEach(() => {
    mockColorScheme = 'light';
    preferenceService = new PreferenceService(new StoragePreferenceRepository(new MemoryKeyValueStore()));
  });

  // A fresh element tree re-renders the provider, as an OS appearance change would.
  const mount = async (): Promise<{ rerender: () => Promise<void> }> => {
    const { Wrapper } = createWrapper({ preferenceService });
    const tree = (): ReactElement => <Wrapper><AppThemeProvider><Probe /></AppThemeProvider></Wrapper>;
    const result = await render(tree());

    return { rerender: () => result.rerender(tree()) };
  };

  it('defaults to following the OS', async () => {
    mockColorScheme = 'dark';
    await mount();

    expect(screen.getByTestId('theme').props.children).toBe('system:dark');
    expect(statusBarStyle()).toBe('light-content');
  });

  it('updates live when the preference changes', async () => {
    await mount();
    expect(screen.getByTestId('theme').props.children).toBe('system:light');

    await act(() => {
      preferenceService.update({ theme: 'dark' });
    });
    expect(screen.getByTestId('theme').props.children).toBe('dark:dark');
    expect(statusBarStyle()).toBe('light-content');

    await act(() => {
      preferenceService.update({ theme: 'light' });
    });
    expect(screen.getByTestId('theme').props.children).toBe('light:light');
    expect(statusBarStyle()).toBe('dark-content');
  });

  it('follows OS changes only while set to Auto', async () => {
    const { rerender } = await mount();

    mockColorScheme = 'dark';
    await rerender();
    expect(screen.getByTestId('theme').props.children).toBe('system:dark');

    await act(() => {
      preferenceService.update({ theme: 'light' });
    });
    mockColorScheme = 'dark';
    await rerender();
    expect(screen.getByTestId('theme').props.children).toBe('light:light');
  });
});
