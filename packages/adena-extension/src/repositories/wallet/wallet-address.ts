import { AdenaStorage } from "@common/storage";

type LocalValueType = 'ADDRESS_BOOK';

export const getAddressBook = async () => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  const addressBook = await localStorage.getToObject('ADDRESS_BOOK');
  return addressBook;
};

export const updateAddressBooke = async (addressBook: { [key in string]: any }) => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.setByObject('ADDRESS_BOOK', addressBook);
};

export const deleteAddress = async () => {
  const localStorage = AdenaStorage.local<LocalValueType>();
  await localStorage.remove('ADDRESS_BOOK');
}