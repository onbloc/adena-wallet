import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';
import { ThemeProvider } from 'styled-components';

import theme from '@styles/theme';
import { OfflineBanner } from '.';

const setBrowserOnline = (online: boolean): void => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  });
};

const Wrapper = ({ children }: PropsWithChildren): JSX.Element => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
};

describe('OfflineBanner', () => {
  afterEach(() => {
    // onlineManager is a module-level singleton; reset it between tests.
    onlineManager.setOnline(undefined);
    setBrowserOnline(true);
  });

  it('renders nothing while the browser reports a connection', () => {
    setBrowserOnline(true);

    const { container } = render(<OfflineBanner />, { wrapper: Wrapper });

    expect(container.innerHTML).toBe('');
  });

  it('states the outage while the browser reports no connection', () => {
    setBrowserOnline(false);

    render(<OfflineBanner />, { wrapper: Wrapper });

    expect(screen.getByRole('status').textContent).toContain('No network connection.');
    expect(screen.getByRole('button').textContent).toContain('Retry');
  });

  it('keeps the bar up after Retry, saying it is running against the signal', () => {
    setBrowserOnline(false);

    render(<OfflineBanner />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('status').textContent).toContain('Retrying anyway.');
    expect(screen.getByRole('button').textContent).toContain('Stop');
    expect(onlineManager.isOnline()).toBe(true);
  });

  it('hands the decision back to the browser when Retry is stopped', () => {
    setBrowserOnline(false);

    render(<OfflineBanner />, { wrapper: Wrapper });
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('status').textContent).toContain('No network connection.');
    expect(onlineManager.isOnline()).toBe(false);
  });
});
