import { describeLoopbackRejection, showGnoConnectNotice } from './gno-connect-notice';

describe('describeLoopbackRejection', () => {
  const REQUIRED = 'dev';

  it('tells the user which network to switch to, and which one they are on', () => {
    const notice = describeLoopbackRejection('ACTIVE_NETWORK_MISMATCH', {
      requiredChainId: REQUIRED,
      metaChainId: 'dev',
      activeChainId: 'sapphire-1',
      activeNetworkName: 'Sapphire',
    });

    // Named the way the network picker names them, so the instruction can be
    // followed without translating a chainId.
    expect(notice.body).toContain('Local (dev)');
    expect(notice.body).toContain('Sapphire (sapphire-1)');
    expect(notice.body).toContain('Switch networks');
  });

  it('falls back to the bare chainId for a network Adena does not bundle', () => {
    const notice = describeLoopbackRejection('ACTIVE_NETWORK_MISMATCH', {
      requiredChainId: REQUIRED,
      metaChainId: 'dev',
      activeChainId: 'my-private-chain',
    });

    expect(notice.body).toContain('my-private-chain');
  });

  it('tells a locked wallet to unlock rather than to switch networks', () => {
    const notice = describeLoopbackRejection('WALLET_UNAVAILABLE', {
      requiredChainId: REQUIRED,
      metaChainId: 'dev',
    });

    expect(notice.body).toContain('locked');
    expect(notice.body).not.toContain('Switch networks');
  });

  it('quotes what the page declared for the origin mismatch', () => {
    const notice = describeLoopbackRejection('ORIGIN_CHAIN_MISMATCH', {
      requiredChainId: REQUIRED,
      metaChainId: 'gnoland1',
      activeChainId: 'dev',
    });

    expect(notice.body).toContain('gnoland1');
    expect(notice.body).toContain('Local (dev)');
  });

  it('clips a page-controlled chainId so it cannot crowd out the message', () => {
    const notice = describeLoopbackRejection('ORIGIN_CHAIN_MISMATCH', {
      requiredChainId: REQUIRED,
      metaChainId: 'x'.repeat(500),
      activeChainId: 'dev',
    });

    expect(notice.body).toContain('…');
    expect(notice.body.length).toBeLessThan(200);
  });
});

describe('showGnoConnectNotice', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    jest.useRealTimers();
  });

  it('renders the notice into the page', () => {
    showGnoConnectNotice({ title: 'Title', body: 'Body' });

    expect(document.getElementById('adena-gnoconnect-notice')).not.toBeNull();
  });

  it('replaces the previous notice instead of stacking copies', () => {
    showGnoConnectNotice({ title: 'Title', body: 'First' });
    showGnoConnectNotice({ title: 'Title', body: 'Second' });

    expect(document.querySelectorAll('#adena-gnoconnect-notice')).toHaveLength(1);
  });

  it('removes itself after the timeout', () => {
    jest.useFakeTimers();
    showGnoConnectNotice({ title: 'Title', body: 'Body' });

    jest.advanceTimersByTime(15_000);

    expect(document.getElementById('adena-gnoconnect-notice')).toBeNull();
  });

  it('renders page-controlled text as text, never as markup', () => {
    // The body can quote a chainId the page declared, so this pins that the
    // notice cannot become an injection point back into the page.
    const payload = '<img src=x onerror="globalThis.__adenaXss = true">';
    showGnoConnectNotice({ title: 'Title', body: payload });

    const shadow = document.getElementById('adena-gnoconnect-notice')?.shadowRoot;

    // Falsifiable both ways: the payload must survive as visible text, and must
    // not have become an element. Rendering it with innerHTML fails the second.
    expect(shadow?.textContent).toContain(payload);
    expect(shadow?.querySelector('img')).toBeNull();
  });
});
