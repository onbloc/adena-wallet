import { getChainNetworkName } from '@common/constants/gno-connect-allowlist.constant';
import { LoopbackTrustRejection } from './gno-connect';

/**
 * Diagnostics for a loopback TxLink the wallet declined to open.
 *
 * The trust gate is deliberately silent toward the page: it returns without
 * calling anything, so a local process cannot tell a rejection apart from a
 * wallet that is not installed. That silence is correct for the page and wrong
 * for the person, who sees a link that does nothing and cannot tell whether
 * their wallet is locked, on another network, or simply too old to support
 * loopback TxLinks at all.
 *
 * Nothing here participates in the decision — the gate has already refused by
 * the time any of this runs, and no text produced here can change that.
 */
export interface GnoConnectNotice {
  title: string;
  body: string;
}

export interface LoopbackRejectionContext {
  /** chainId the origin may act as, per chains.json. */
  requiredChainId: string;
  /** chainId the page declared via meta tag. Page-controlled. */
  metaChainId: string;
  /** The wallet's active network, absent when it reported none. */
  activeChainId?: string;
  activeNetworkName?: string;
}

const NOTICE_TITLE = 'Adena did not open this transaction';

// Page-controlled text is quoted back so the developer can see what their page
// actually declared, so it is clipped to a length that cannot push the rest of
// the message off screen. It is rendered with textContent, never as markup.
const MAX_QUOTED_LENGTH = 40;

function clip(value: string): string {
  return value.length <= MAX_QUOTED_LENGTH ? value : `${value.slice(0, MAX_QUOTED_LENGTH)}…`;
}

// Names a network the way the picker does, so the instruction matches what the
// user is looking for: `Local (dev)`. Falls back to the bare chainId for a
// network Adena does not bundle.
function describeNetwork(chainId: string, knownName?: string): string {
  const name = knownName ?? getChainNetworkName(chainId) ?? null;
  return name === null || name === chainId ? chainId : `${name} (${chainId})`;
}

export function describeLoopbackRejection(
  rejection: LoopbackTrustRejection,
  context: LoopbackRejectionContext,
): GnoConnectNotice {
  const required = describeNetwork(context.requiredChainId);

  if (rejection === 'ORIGIN_CHAIN_MISMATCH') {
    return {
      title: NOTICE_TITLE,
      body:
        `This page declared the network "${clip(context.metaChainId)}", but a page served ` +
        `from this address may only act as ${required}.`,
    };
  }

  if (rejection === 'WALLET_UNAVAILABLE') {
    return {
      title: NOTICE_TITLE,
      body:
        'Adena is locked, or has no account selected. Unlock it, make sure you are on ' +
        `${required}, then use the link again.`,
    };
  }

  const active =
    context.activeChainId === undefined
      ? 'another network'
      : describeNetwork(context.activeChainId, context.activeNetworkName);

  return {
    title: NOTICE_TITLE,
    body:
      `This link is for ${required}, but Adena is on ${active}. Switch networks in ` +
      'Adena, then use the link again.',
  };
}

const NOTICE_HOST_ID = 'adena-gnoconnect-notice';
const NOTICE_TIMEOUT_MS = 15_000;

/**
 * Renders the notice into the page, inside a closed shadow root so neither side's
 * CSS reaches the other.
 *
 * This is diagnostics, not a security surface: any page could draw the same box
 * itself, so the notice must never be read as proof that Adena said something.
 * It carries no controls beyond dismissing itself and asks for no input.
 *
 * The root is open rather than closed. Closing it would protect nothing — there
 * is no secret in here, and the page can remove the host element either way —
 * while making the rendered result impossible to assert on or to inspect when
 * debugging the very silence this exists to break.
 */
export function showGnoConnectNotice(notice: GnoConnectNotice): void {
  if (typeof document === 'undefined') {
    return;
  }

  const container = document.body ?? document.documentElement;
  if (!container) {
    return;
  }

  // Replace rather than stack: clicking a dead link repeatedly should not build
  // a wall of identical boxes.
  document.getElementById(NOTICE_HOST_ID)?.remove();

  const host = document.createElement('div');
  host.id = NOTICE_HOST_ID;
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .card {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2147483647;
      max-width: 340px;
      box-sizing: border-box;
      padding: 14px 16px;
      border: 1px solid #e0a72e;
      border-radius: 10px;
      background: #1f1b14;
      color: #f5efe3;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
    }
    .title {
      display: block;
      margin-bottom: 4px;
      padding-right: 16px;
      font-weight: 600;
      color: #e0a72e;
    }
    .close {
      position: absolute;
      top: 8px;
      right: 10px;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font-size: 15px;
      line-height: 1;
      cursor: pointer;
    }
    @media (prefers-reduced-motion: no-preference) {
      .card { animation: fade 160ms ease-out; }
      @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    }
  `;

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'status');
  card.setAttribute('aria-live', 'polite');

  const title = document.createElement('strong');
  title.className = 'title';
  title.textContent = notice.title;

  const body = document.createElement('span');
  body.textContent = notice.body;

  const close = document.createElement('button');
  close.className = 'close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Dismiss');
  close.textContent = '×';
  close.addEventListener('click', () => host.remove());

  card.append(close, title, body);
  shadow.append(style, card);
  container.appendChild(host);

  setTimeout(() => host.remove(), NOTICE_TIMEOUT_MS);
}
