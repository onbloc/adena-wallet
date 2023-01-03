import { WalletAccountRepository, WalletEstablishRepository, WalletRepository } from '@repositories/wallet';

export const getCurrentEstablisedSites = async () => {
  const establishedSites = await WalletEstablishRepository.getEstablishedSites();
  const currentAccountAddress = await WalletAccountRepository.getCurrentAccountAddress();
  const accountEstablishedSites = await getAccountEstablishedSites(
    establishedSites,
    currentAccountAddress,
  );
  return accountEstablishedSites;
};

export const isEstablished = async (hostname: string) => {
  const establishedSites = await WalletEstablishRepository.getEstablishedSites();
  const currentAccountAddress = await WalletAccountRepository.getCurrentAccountAddress();
  const accountEstablishedSites = await getAccountEstablishedSites(
    establishedSites,
    currentAccountAddress,
  );
  return accountEstablishedSites.findIndex((site: any) => site.hostname === hostname) > -1;
};

export const establish = async (hostname: string, appName: string, favicon?: string | null) => {
  const establishedSites = await WalletEstablishRepository.getEstablishedSites();
  const currentChainId = await WalletRepository.getCurrentChainId();
  const currentAccountAddress = await WalletAccountRepository.getCurrentAccountAddress();
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
        chainId: currentChainId !== '' ? currentChainId : 'test3',
        account: currentAccountAddress,
        name: appName,
        favicon: favicon ?? null,
        establishedTime: `${new Date().getTime()}`,
      },
    ],
  };
  await WalletEstablishRepository.updateEstablishedSites(changedEstablishedSites);
};

export const unestablish = async (hostname: string) => {
  const establishedSites = await WalletEstablishRepository.getEstablishedSites();
  const currentAccountAddress = await WalletAccountRepository.getCurrentAccountAddress();
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
  await WalletEstablishRepository.updateEstablishedSites(changedEstablishedSites);
};

const getAccountEstablishedSites = async (
  establishedSites: { [key in string]: any },
  currentAccountAddress: string,
) => {
  const currentChainId = await WalletRepository.getCurrentChainId();
  const accountEstablishedSites =
    Object.keys(establishedSites).findIndex((key) => key === currentAccountAddress) > -1
      ? [...establishedSites[currentAccountAddress]].filter(
        (site) => site.chainId === currentChainId,
      )
      : [];
  return accountEstablishedSites;
};
