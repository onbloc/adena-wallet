import { AddressBookValidationError } from '@common/errors/validation/address-book-validation-error';
import { addressValidationCheck } from '@common/utils/client-utils';
import { BookListProps } from '@pages/certify/address-book';
import { Account } from 'adena-module';

export const validateInvalidAddress = (address: string): boolean => {
  const invalidCheck = addressValidationCheck(address);
  if (!invalidCheck) {
    throw new AddressBookValidationError('INVALID_ADDRESS');
  }
  return true;
};

export const validateAlreadyAddress = (
  currData: BookListProps,
  allData: BookListProps[],
  isAdd: boolean,
): boolean => {
  let check: boolean;
  if (isAdd) {
    check = allData.some((v: BookListProps) => v.address === currData.address);
  } else {
    const filterData = allData.filter(
      (v: BookListProps) => v.id !== currData.id && v.address === currData.address,
    );
    check = Boolean(filterData.length);
  }
  if (check) {
    throw new AddressBookValidationError('ALREADY_ADDRESS');
  }
  return true;
};

export const validateAlreadyAddressByAccounts = async (
  currData: BookListProps,
  accounts: Account[],
  isAdd: boolean,
): Promise<boolean> => {
  let check: boolean;
  const addresses = await Promise.all(accounts.map((account) => account.getAddress('g')));
  if (isAdd) {
    check = addresses.some((address) => address === currData.address);
  } else {
    const filterData = addresses.filter((address) => address === currData.address);
    check = Boolean(filterData.length);
  }
  if (check) {
    throw new AddressBookValidationError('ALREADY_ADDRESS');
  }
  return true;
};

export const validateAlreadyName = (
  currData: BookListProps,
  allData: BookListProps[],
  isAdd: boolean,
): boolean => {
  let check: boolean;
  if (isAdd) {
    check = allData.some((v: BookListProps) => v.name === currData.name);
  } else {
    const filterData = allData.filter(
      (v: BookListProps) => v.id !== currData.id && v.name === currData.name,
    );
    check = Boolean(filterData.length);
  }
  if (check) {
    throw new AddressBookValidationError('ALREADY_NAME');
  }
  return true;
};
