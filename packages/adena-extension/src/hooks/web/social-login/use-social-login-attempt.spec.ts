import { renderHook } from '@testing-library/react';

import useSocialLoginAttempt from './use-social-login-attempt';

describe('useSocialLoginAttempt', () => {
  it('lets the attempt that owns the popup commit', () => {
    const { result } = renderHook(() => useSocialLoginAttempt());

    const isCurrentRequest = result.current.begin();

    expect(isCurrentRequest()).toBe(true);
  });

  it('hands ownership to the newest attempt', () => {
    const { result } = renderHook(() => useSocialLoginAttempt());

    const first = result.current.begin();
    const second = result.current.begin();

    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });

  it('abandons the attempt in flight', () => {
    const { result } = renderHook(() => useSocialLoginAttempt());

    const isCurrentRequest = result.current.begin();
    result.current.abandon();

    expect(isCurrentRequest()).toBe(false);
  });

  // `WebRouter` answers the browser's Back button by navigating Home, which
  // never reaches a screen's `backStep` — the hook just unmounts. A popup
  // resolving afterwards must not be allowed to add an account.
  it('abandons the attempt when the screen unmounts', () => {
    const { result, unmount } = renderHook(() => useSocialLoginAttempt());

    const isCurrentRequest = result.current.begin();
    unmount();

    expect(isCurrentRequest()).toBe(false);
  });
});
