import { AdenaStorage } from "@common/storage";

type LocalValueType = 'ESTABLISH_SITES';

export const getEstablishedSites = async () => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  const establishedSites = await localStorage.getToObject('ESTABLISH_SITES');
  return establishedSites;
};

export const updateEstablishedSites = async (addressBook: { [key in string]: any }) => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.setByObject('ESTABLISH_SITES', addressBook);
};

export const deleteEstablishedSites = async () => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.remove('ESTABLISH_SITES');
}