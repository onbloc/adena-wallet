import { useEffect, useState } from 'react';

import { useWalletContext } from '@hooks/use-context';
import { flattenSessionAccount } from '@common/provider/gno/utils';

export interface CurrentSessionChainData {
  allowPaths: string[];
  spendPeriod: number;
  spendReset: number;
  spendUsed: string;
  spendLimit: string;
}

// Fetches fresh chain-side metadata for the (master, session) pair so the
// Session Overview popover renders the same Spend Period countdown as the
// Manage Sessions screen, which already pulls these values from chain via
// useMasterSessions.
export const useCurrentSessionChainData = (
  masterAddress: string | undefined,
  sessionAddress: string | undefined,
): CurrentSessionChainData | undefined => {
  const { gnoProvider } = useWalletContext();
  const [data, setData] = useState<CurrentSessionChainData | undefined>(undefined);

  useEffect(() => {
    if (!gnoProvider || !masterAddress || !sessionAddress) {
      setData(undefined);
      return;
    }
    let cancelled = false;
    (async (): Promise<void> => {
      try {
        const res = await gnoProvider.getSession(masterAddress, sessionAddress);
        if (cancelled || !res) {
          if (!cancelled) setData(undefined);
          return;
        }
        const flat = flattenSessionAccount(res);
        setData({
          allowPaths: flat.allowPaths,
          spendPeriod: Number(flat.spendPeriod || '0'),
          spendReset: Number(flat.spendReset || '0'),
          spendUsed: flat.spendUsed,
          spendLimit: flat.spendLimit,
        });
      } catch {
        if (!cancelled) setData(undefined);
      }
    })();
    return (): void => {
      cancelled = true;
    };
  }, [gnoProvider, masterAddress, sessionAddress]);

  return data;
};
