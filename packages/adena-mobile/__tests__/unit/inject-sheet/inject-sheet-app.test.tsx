import { render, screen } from '@testing-library/react-native';
import React, { ReactElement } from 'react';

import { InjectSheetPage, InjectSheetPageProps } from '../../../src/components/pages';
import InjectSheetApp from '../../../src/inject-sheet/inject-sheet-app';
import { finishSheet, SheetSession } from '../../../src/inject-sheet/inject-sheet-screen';
import { useNativeContainerQuery } from '../../../src/queries/boot.queries';

type MockNative = { complete: jest.Mock; dismiss: jest.Mock; onDismissRequest: jest.Mock };
const mockNative = { current: null as MockNative | null };
const mockSheet = { crash: false, inFlightOnCrash: false, session: null as SheetSession | null };
let dismissListener: ((token: string) => void) | undefined;
const removeListener = jest.fn();
const createNative = (): MockNative => ({
  complete: jest.fn(),
  dismiss: jest.fn(),
  onDismissRequest: jest.fn((listener: (token: string) => void) => {
    dismissListener = listener;

    return { remove: removeListener };
  }),
});

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
    createSheetSession: (token?: string) => ({ token, inFlight: false, done: false }),
    finishSheet: jest.fn(),
    InjectSheetScreen: ({ requestUrl, session }: { requestUrl?: string; session: SheetSession }): ReactElement => {
      mockSheet.session = session;

      if (mockSheet.crash) {
        session.inFlight = mockSheet.inFlightOnCrash;
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
  const failUnexpected = jest.fn(() => 'cb://fail');
  const container = { dappService: { parseRequestUrl, failUnexpected } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSheet.crash = false;
    mockSheet.inFlightOnCrash = false;
    mockSheet.session = null;
    dismissListener = undefined;
    mockNative.current = createNative();
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
    expect(finishSheet).toHaveBeenCalledWith(undefined, null);
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
    // The crash message stays internal: only a generic failure reaches the dApp.
    expect(failUnexpected).toHaveBeenCalledWith({ requestId: 'adena://request?payload=x' });
    expect(finishSheet).toHaveBeenCalledWith(undefined, 'cb://fail');
  });

  it('just closes after a crash without a request url', async () => {
    mockSheet.crash = true;
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await render(<InjectSheetApp />);
    expect(finishSheet).toHaveBeenCalledWith(undefined, null);
    expect(failUnexpected).not.toHaveBeenCalled();
  });

  it('closes when the crashed request cannot be parsed', async () => {
    mockSheet.crash = true;
    parseRequestUrl.mockImplementationOnce(() => {
      throw new Error('bad link');
    });
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await render(<InjectSheetApp requestUrl='adena://request?payload=bad' />);
    expect(finishSheet).toHaveBeenCalledWith(undefined, null);
  });

  it('does not answer twice when the crash happens mid-approval', async () => {
    mockSheet.crash = true;
    mockSheet.inFlightOnCrash = true;
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await render(<InjectSheetApp requestUrl='adena://request?payload=x' />);
    expect(finishSheet).not.toHaveBeenCalled();
  });
  it('gives the screen a session with the launch token and caller package', async () => {
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await render(<InjectSheetApp requestUrl='adena://request?payload=x' sheetToken='sheet-1' callerPackage='com.example.app' />);
    expect(mockSheet.session).toMatchObject({ token: 'sheet-1', inFlight: false, done: false });
  });

  it('routes back presses for its own token to the screen, and closes before boot', async () => {
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({}));
    const view = await render(<InjectSheetApp requestUrl='adena://request?payload=x' sheetToken='sheet-1' />);

    dismissListener?.('sheet-2');
    expect(finishSheet).not.toHaveBeenCalled();
    dismissListener?.('sheet-1');
    expect(finishSheet).toHaveBeenCalledWith('sheet-1', null);

    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await view.rerender(<InjectSheetApp requestUrl='adena://request?payload=x' sheetToken='sheet-1' />);
    const onDismissRequest = jest.fn();

    (mockSheet.session as SheetSession).onDismissRequest = onDismissRequest;
    dismissListener?.('sheet-1');
    expect(onDismissRequest).toHaveBeenCalledTimes(1);
    await view.unmount();
    expect(removeListener).toHaveBeenCalled();
  });

  it('passes the caller package when answering a crash', async () => {
    mockSheet.crash = true;
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await render(<InjectSheetApp requestUrl='adena://request?payload=x' sheetToken='sheet-1' callerPackage='com.example.app' />);
    expect(parseRequestUrl).toHaveBeenCalledWith('adena://request?payload=x', 'com.example.app');
    expect(finishSheet).toHaveBeenCalledWith('sheet-1', 'cb://fail');
  });
});
