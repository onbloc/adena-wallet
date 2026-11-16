/** Calls that are nothing left to do once the window is gone. */
const NO_OP_ON_DISCARDED = new Set(['close', 'focus', 'blur']);

const noop = (): void => undefined;

/**
 * A popup reference that keeps answering after the browser has discarded the
 * window behind it.
 *
 * Firefox drops the WindowProxy of a popup it has torn down, and every access
 * on that reference then throws "can't access dead object" instead of
 * reporting `closed`. Chrome keeps the proxy readable, so code written against
 * Chrome polls a popup unguarded — which is exactly what `@web3auth/auth`'s
 * PopupHandler does, on a 500ms timer and again when it closes the popup after
 * the login result has arrived.
 *
 * A discarded reference is NOT reported as closed. Firefox discards it well
 * before the window goes away — it dies on the cross-process navigation to the
 * provider, with the user still signing in — and the handler reads `closed` as
 * "the user gave up" and rejects the login. What it does report is the close
 * the opener itself asked for: that one is true by construction, and it is
 * what lets the handler's timer stop polling.
 *
 * The cost is that a popup the user really does close goes unnoticed on
 * Firefox, so the screen waits instead of failing fast. That is the lesser
 * half of the trade: the other reading breaks every login.
 *
 * Nothing throws on Chrome, so there every trap forwards to the real window
 * and the wrapper is a pass-through.
 *
 * The traps below cover reads, writes, `in` and `instanceof` — everything any
 * caller does to a popup reference beyond the `closed`/`close()`/`focus()` the
 * SDK itself uses. Key enumeration is deliberately left to the empty target:
 * forwarding it would have to report descriptors the target does not have,
 * which the Proxy invariants reject, and nothing enumerates a popup.
 */
const wrapPopupWindow = (popup: Window): Window => {
  // Set when `close()` is called through this reference, which is the opener
  // saying the window is done rather than a guess about what the browser did.
  let closedByOpener = false;

  return new Proxy({} as Window, {
    set(_target, property, value): boolean {
      try {
        (popup as unknown as Record<PropertyKey, unknown>)[property] = value;
      } catch {
        // The window is gone, so the write has nowhere to land and no effect
        // to report — the same as writing to a window that closed.
      }
      return true;
    },

    has(_target, property): boolean {
      try {
        return property in popup;
      } catch {
        return false;
      }
    },

    getPrototypeOf(): object | null {
      try {
        return Object.getPrototypeOf(popup);
      } catch {
        return null;
      }
    },

    get(_target, property): unknown {
      if (property === 'closed' && closedByOpener) {
        return true;
      }

      let value: unknown;

      try {
        value = popup[property as keyof Window];
      } catch {
        if (property === 'closed') {
          // Discarded, not known to be closed. See the note above.
          return false;
        }
        if (typeof property !== 'string' || !NO_OP_ON_DISCARDED.has(property)) {
          return undefined;
        }
        return property === 'close'
          ? (): void => {
              closedByOpener = true;
            }
          : noop;
      }

      if (typeof value !== 'function') {
        return value;
      }

      // Bound to the real window, and guarded again: the window can be
      // discarded between reading the method and calling it.
      return (...args: unknown[]): unknown => {
        if (property === 'close') {
          closedByOpener = true;
        }
        try {
          return (value as (...callArgs: unknown[]) => unknown).apply(popup, args);
        } catch {
          return undefined;
        }
      };
    },
  });
};

// Nested installs would otherwise restore the outer wrapper as the "native"
// opener and leave it in place for good.
let installDepth = 0;
let nativeOpen: typeof window.open | null = null;

/**
 * Runs `task` with `window.open` handing out guarded popup references.
 *
 * Scoped to the call that needs it rather than installed for the page, so
 * every other `window.open` keeps returning a real window. The guard outlives
 * the scope through the reference itself, which is what the caller holds on
 * to — restoring `window.open` afterwards does not un-guard a popup already
 * opened.
 */
export const withPopupWindowGuard = async <T>(task: () => Promise<T>): Promise<T> => {
  if (typeof window === 'undefined') {
    return task();
  }

  if (installDepth === 0) {
    nativeOpen = window.open;
    const open = nativeOpen;

    window.open = function guardedOpen(
      this: Window,
      ...args: Parameters<typeof window.open>
    ): Window | null {
      const popup = open.apply(this, args);
      return popup ? wrapPopupWindow(popup) : popup;
    };
  }

  installDepth += 1;

  try {
    return await task();
  } finally {
    installDepth -= 1;
    if (installDepth === 0 && nativeOpen) {
      window.open = nativeOpen;
      nativeOpen = null;
    }
  }
};
