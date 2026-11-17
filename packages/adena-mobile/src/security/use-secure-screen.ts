import {useEffect, useState} from 'react';

import {acquireSecureScreen, onScreenshotTaken} from './native-security';

/**
 * For screens that show a mnemonic or private key: blocks capture on Android,
 * covers the window while recording on iOS, and reports screenshots (iOS
 * cannot prevent them) so the screen can warn the user.
 */
export function useSecureScreen(): {screenshotTaken: boolean} {
  const [screenshotTaken, setScreenshotTaken] = useState(false);

  useEffect(() => {
    const release = acquireSecureScreen();
    const unsubscribe = onScreenshotTaken(() => setScreenshotTaken(true));
    return () => {
      unsubscribe();
      release();
    };
  }, []);

  return {screenshotTaken};
}
