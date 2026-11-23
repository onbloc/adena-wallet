import { render, screen } from '@testing-library/react-native';
import React, { ReactElement } from 'react';

import { InjectSheetPage, InjectSheetPageProps } from '../../../src/components/pages';
import InjectSheetApp from '../../../src/inject-sheet/inject-sheet-app';
import { finishSheet, sheetApproval } from '../../../src/inject-sheet/inject-sheet-screen';
import { useNativeContainerQuery } from '../../../src/queries/boot.queries';

const mockNative = { current: { complete: jest.fn(), dismiss: jest.fn() } as { complete: jest.Mock; dismiss: jest.Mock } | null };
const mockSheet = { crash: false };

jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('../../../src/native/NativeAdenaInjectSheet', () => ({
  __esModule: true,
  get default() {
    return mockNative.current;
  },
}));
jest.mock('../../../src/queries/boot.queries', () => ({ useNativeContainerQuery: jest.fn() }));
jest.mock('../../../src/components/pages', () => ({ InjectSheetPage: jest.fn(() => null) }));
jest.mock('../../../src/inject-sheet/inject-sheet-screen', () => {
  const { Text } = jest.requireActual('react-native');

  return {
    sheetApproval: { inFlight: false },
    finishSheet: jest.fn(),
    InjectSheetScreen: ({ requestUrl }: { requestUrl?: string }): ReactElement => {
      if (mockSheet.crash) {
        throw new Error('render failed');
      }

      return <Text>{`screen:${requestUrl}`}</Text>;
    },
  };
});

const boot = (overrides: object) => ({ data: undefined, isError: false, error: null, ...overrides });
const pageProps = (): InjectSheetPageProps => (InjectSheetPage as unknown as jest.Mock).mock.calls.at(-1)[0];

describe('InjectSheetApp', () => {
  const parseRequestUrl = jest.fn((url: string) => ({ requestId: url }));
  const fail = jest.fn(() => 'cb://fail');
  const container = { dappService: { parseRequestUrl, fail } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSheet.crash = false;
    sheetApproval.inFlight = false;
    mockNative.current = { complete: jest.fn(), dismiss: jest.fn() };
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('renders nothing while booting', async () => {
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({}));
    await render(<InjectSheetApp requestUrl='adena://request?payload=x' />);
    expect(screen.queryByText(/./)).toBeNull();
    expect(InjectSheetPage).not.toHaveBeenCalled();
  });

  it('renders the request screen once booted', async () => {
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await render(<InjectSheetApp requestUrl='adena://request?payload=x' />);
    expect(screen.getByText('screen:adena://request?payload=x')).toBeTruthy();
  });

  it('shows a closable failure page when boot fails', async () => {
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ isError: true, error: new Error('Keystore unavailable') }));
    await render(<InjectSheetApp />);
    const props = pageProps();

    expect(props.unavailable).toEqual({ title: 'Adena could not start', description: 'Keystore unavailable' });
    expect(props.canApprove).toBe(false);
    expect(props.onApprove()).toBeUndefined();
    props.onReject();
    expect(mockNative.current?.dismiss).toHaveBeenCalled();
  });

  it('stringifies a non-Error boot failure and tolerates a missing native module', async () => {
    mockNative.current = null;
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ isError: true, error: 'raw failure' }));
    await render(<InjectSheetApp />);
    expect(pageProps().unavailable?.description).toBe('raw failure');
    expect(() => pageProps().onReject()).not.toThrow();
  });

  it('answers the dApp with a failure when the screen crashes', async () => {
    mockSheet.crash = true;
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await render(<InjectSheetApp requestUrl='adena://request?payload=x' />);
    expect(screen.queryByText(/screen:/)).toBeNull();
    expect(fail).toHaveBeenCalledWith({ requestId: 'adena://request?payload=x' }, expect.objectContaining({ message: 'render failed' }));
    expect(finishSheet).toHaveBeenCalledWith('cb://fail');
  });

  it('just closes after a crash without a request url', async () => {
    mockSheet.crash = true;
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await render(<InjectSheetApp />);
    expect(finishSheet).toHaveBeenCalledWith(null);
    expect(fail).not.toHaveBeenCalled();
  });

  it('closes when the crashed request cannot be parsed', async () => {
    mockSheet.crash = true;
    parseRequestUrl.mockImplementationOnce(() => {
      throw new Error('bad link');
    });
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await render(<InjectSheetApp requestUrl='adena://request?payload=bad' />);
    expect(finishSheet).toHaveBeenCalledWith(null);
  });

  it('does not answer twice when the crash happens mid-approval', async () => {
    mockSheet.crash = true;
    sheetApproval.inFlight = true;
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await render(<InjectSheetApp requestUrl='adena://request?payload=x' />);
    expect(finishSheet).not.toHaveBeenCalled();
  });
});
