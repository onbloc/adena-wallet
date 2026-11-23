import { fireEvent, render, screen } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { Pressable, Text } from 'react-native';

import { ErrorBoundary } from '../../../src/app/error-boundary';

let shouldThrow = true;

const Bomb = (): ReactElement => {
  if (shouldThrow) {
    throw new Error('kaboom');
  }

  return <Text>Recovered</Text>;
};

const fallback = (reset: () => void) => (
  <Pressable accessibilityRole='button' onPress={reset}><Text>Reload</Text></Pressable>
);

describe('ErrorBoundary', () => {
  beforeEach(() => {
    shouldThrow = true;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('renders children when nothing throws', async () => {
    shouldThrow = false;
    await render(<ErrorBoundary fallback={fallback}><Bomb /></ErrorBoundary>);
    expect(screen.getByText('Recovered')).toBeTruthy();
  });

  it('catches a render error, reports it and resets', async () => {
    const onError = jest.fn();

    await render(<ErrorBoundary fallback={fallback} onError={onError}><Bomb /></ErrorBoundary>);
    expect(screen.getByText('Reload')).toBeTruthy();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'kaboom' }));

    shouldThrow = false;
    await fireEvent.press(screen.getByRole('button'));
    expect(screen.getByText('Recovered')).toBeTruthy();
  });

  it('catches without an onError handler', async () => {
    await render(<ErrorBoundary fallback={fallback}><Bomb /></ErrorBoundary>);
    expect(screen.getByText('Reload')).toBeTruthy();
  });
});
