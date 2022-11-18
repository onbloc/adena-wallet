import { LocalStorageValue } from '@common/values';

export const getCurrentEstablisedSites = async () => {
  const establishedSites = await LocalStorageValue.getToObject('ESTABLISH_SITES');
  const currentAccountAddress = await LocalStorageValue.get('CURRENT_ACCOUNT_ADDRESS');
  const accountEstablishedSites = await getAccountEstablishedSites(
    establishedSites,
    currentAccountAddress,
  );
  return accountEstablishedSites;
};

export const isEstablished = async (hostname: string) => {
  const establishedSites = await LocalStorageValue.getToObject('ESTABLISH_SITES');
  const currentAccountAddress = await LocalStorageValue.get('CURRENT_ACCOUNT_ADDRESS');
  const accountEstablishedSites = await getAccountEstablishedSites(
    establishedSites,
    currentAccountAddress,
  );
  return accountEstablishedSites.findIndex((site: any) => site.hostname === hostname) > -1;
};

export const establish = async (hostname: string, appName: string, favicon?: string | null) => {
  const establishedSites = await LocalStorageValue.getToObject('ESTABLISH_SITES');
  const currentAccountAddress = await LocalStorageValue.get('CURRENT_ACCOUNT_ADDRESS');
  const accountEstablishedSites = await getAccountEstablishedSites(
    establishedSites,
    currentAccountAddress,
  );
  const changedEstablishedSites: { [key in string]: any } = {
    ...establishedSites,
    [currentAccountAddress]: [
      ...accountEstablishedSites.filter((site: any) => site.hostname !== hostname),
      {
        hostname,
        account: currentAccountAddress,
        name: appName,
        favicon: favicon ?? null,
        establishedTime: `${new Date().getTime()}`,
      },
    ],
  };
  await LocalStorageValue.setByObject('ESTABLISH_SITES', changedEstablishedSites);
};

export const unestablish = async (hostname: string) => {
  const establishedSites = await LocalStorageValue.getToObject('ESTABLISH_SITES');
  const currentAccountAddress = await LocalStorageValue.get('CURRENT_ACCOUNT_ADDRESS');
  const accountEstablishedSites = await getAccountEstablishedSites(
    establishedSites,
    currentAccountAddress,
  );

  const changedAccountEstablishedSites = accountEstablishedSites.filter(
    (site: any) => site.hostname !== hostname,
  );

  // eslint-disable-next-line prefer-const
  let changedEstablishedSites = {
    ...establishedSites,
    [currentAccountAddress]: changedAccountEstablishedSites,
  };
  await LocalStorageValue.setByObject('ESTABLISH_SITES', changedEstablishedSites);
};

const getAccountEstablishedSites = async (
  establishedSites: { [key in string]: any },
  currentAccountAddress: string,
) => {
  const accountEstablishedSites =
    Object.keys(establishedSites).findIndex((key) => key === currentAccountAddress) > -1
      ? establishedSites[currentAccountAddress]
      : [];
  return accountEstablishedSites;
};
