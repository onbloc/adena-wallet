import { AddressBookValidationError } from '@common/errors/validation/address-book-validation-error';
import { addressValidationCheck } from '@common/utils/client-utils';
import { AddressBookItem } from '@repositories/wallet';
import { Account } from 'adena-module';

export const validateInvalidAddress = (address: string): boolean => {
  const invalidCheck = addressValidationCheck(address);
  if (!invalidCheck) {
    throw new AddressBookValidationError('INVALID_ADDRESS');
  }
  return true;
};

export const validateAlreadyAddress = (
  currData: AddressBookItem,
  allData: AddressBookItem[],
  isAdd: boolean,
): boolean => {
  let check: boolean;
  if (isAdd) {
    check = allData.some((v: AddressBookItem) => v.address === currData.address);
  } else {
    const filterData = allData.filter(
      (v: AddressBookItem) => v.id !== currData.id && v.address === currData.address,
    );
    check = Boolean(filterData.length);
  }
  if (check) {
    throw new AddressBookValidationError('ALREADY_ADDRESS');
  }
  return true;
};

export const validateAlreadyAddressByAccounts = (
  currData: AddressBookItem,
  accounts: Account[],
  isAdd: boolean,
): boolean => {
  let check: boolean;
  if (isAdd) {
    check = accounts.some((account) => account.getAddress('g') === currData.address);
  } else {
    const filterData = accounts.filter((account) => account.getAddress('g') === currData.address);
    check = Boolean(filterData.length);
  }
  if (check) {
    throw new AddressBookValidationError('ALREADY_ADDRESS');
  }
  return true;
};

export const validateAlreadyName = (
  currData: AddressBookItem,
  allData: AddressBookItem[],
  isAdd: boolean,
): boolean => {
  let check: boolean;
  if (isAdd) {
    check = allData.some((v: AddressBookItem) => v.name === currData.name);
  } else {
    const filterData = allData.filter(
      (v: AddressBookItem) => v.id !== currData.id && v.name === currData.name,
    );
    check = Boolean(filterData.length);
  }
  if (check) {
    throw new AddressBookValidationError('ALREADY_NAME');
  }
  return true;
};
