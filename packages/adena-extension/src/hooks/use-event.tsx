import { getSiteName } from '@common/utils/client-utils';
import { EventMessageData } from '@inject/message';
import { EstablishSite } from '@repositories/wallet';
import { useCallback } from 'react';

import { useAdenaContext } from './use-context';

export type UseEventReturn = {
  dispatchEvent: (message: EventMessageData) => void;
};

const toSiteName = (url: string | undefined): string | null => {
  if (!url) {
    return null;
  }
  try {
    const { protocol, hostname } = new URL(url);
    return getSiteName(protocol, hostname);
  }
  catch {
    return null;
  }
};

/**
 * Sends the event to every open tab whose site is connected to the current
 * account, using the same hostname check as `checkEstablished`.
 */
export const dispatchEventToEstablishedTabs = async (
  message: EventMessageData,
  getEstablishedSites: () => Promise<EstablishSite[]>,
): Promise<void> => {
  const [tabs, sites] = await Promise.all([chrome.tabs.query({}), getEstablishedSites()]);
  const establishedSiteNames = new Set(sites.map(site => site.hostname));

  tabs.forEach((tab) => {
    const siteName = toSiteName(tab.url);
    if (!tab.id || !siteName || !establishedSiteNames.has(siteName)) {
      return;
    }
    chrome.tabs.sendMessage(tab.id, message).catch(console.warn);
  });
};

export const useEvent = (): UseEventReturn => {
  const { accountService, establishService } = useAdenaContext();

  const dispatchEvent = useCallback(
    (message: EventMessageData): void => {
      dispatchEventToEstablishedTabs(message, async () => {
        const accountId = await accountService.getCurrentAccountId();
        return establishService.getEstablishedSitesBy(accountId);
      }).catch(console.warn);
    },
    [accountService, establishService],
  );

  return { dispatchEvent };
};
