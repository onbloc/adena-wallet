import React, { useRef, useState, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';

import { Text, DefaultInput, inputStyle, ErrorText, LeftArrowBtn } from '@components/atoms';
import { CancelAndConfirmButton } from '@components/molecules';
import add from '@assets/add-symbol.svg';
import edit from '@assets/edit-symbol.svg';
import { getTheme } from '@styles/theme';
import {
  validateAlreadyAddress,
  validateAlreadyAddressByAccounts,
  validateAlreadyName,
  validateInvalidAddress,
} from '@services/index';
import { AddressBookValidationError } from '@common/errors/validation/address-book-validation-error';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import mixins from '@styles/mixins';
import { AddressBookItem } from '@repositories/wallet';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@router/path';

const specialPatternCheck = /\W|\s/g;
const ACCOUNT_NAME_LENGTH_LIMIT = 23;

const AddAddress = (): JSX.Element => {
  const theme = useTheme();
  const { wallet } = useWalletContext();
  const { addressBookService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { params, goBack } = useAppNavigate<RoutePath.AddAddress>();
  const isAdd = params.status === 'add';

  const addressList: AddressBookItem[] = params.addressList;
  const [name, setName] = useState(() => params.curr?.name ?? '');
  const [address, setAddress] = useState(() => params.curr?.address ?? '');
  const [nameError, setNameError] = useState<boolean>(false);
  const [addressError, setAddressError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const onChangeAddress = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const patternCheck = e.target.value.replace(specialPatternCheck, '');
    setAddress(() => patternCheck.toLowerCase());
  };

  const onChangeName = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const inputText = e.target.value;
    if (inputText.length <= ACCOUNT_NAME_LENGTH_LIMIT) {
      setName(e.target.value);
    }
  };

  const saveButtonClick = (): void => {
    let isValid = true;
    let errorMessage = '';
    const currData: AddressBookItem = {
      id: params.curr?.id ?? '',
      name: name,
      address: address,
      createdAt: params.curr?.createdAt ?? '',
    };

    try {
      validateInvalidAddress(address);
    } catch (error) {
      isValid = false;
      if (error instanceof AddressBookValidationError) {
        setAddressError(true);
        if (errorMessage === '') {
          errorMessage = error.message;
        }
      }
    }

    try {
      validateAlreadyAddress(currData, addressList, isAdd);
    } catch (error) {
      isValid = false;
      if (error instanceof AddressBookValidationError) {
        setAddressError(true);
        if (errorMessage === '') {
          errorMessage = error.message;
        }
      }
    }

    try {
      validateAlreadyAddressByAccounts(currData, wallet?.accounts ?? [], isAdd);
    } catch (error) {
      isValid = false;
      if (error instanceof AddressBookValidationError) {
        setAddressError(true);
        if (errorMessage === '') {
          errorMessage = error.message;
        }
      }
    }

    try {
      validateAlreadyName(currData, addressList, isAdd);
    } catch (error) {
      isValid = false;
      if (error instanceof AddressBookValidationError) {
        setNameError(true);
        if (errorMessage === '') {
          errorMessage = error.message;
        }
      }
    }

    setErrorMsg(errorMessage);
    if (isValid) {
      isAdd ? addHandler() : editHandler();
    }
  };

  const addHandler = async (): Promise<void> =>
    await addressBookService.addAddressBookItem({ name, address }).then(goBack);

  const editHandler = async (): Promise<void> =>
    await addressBookService
      .updateAddressBookItemById({
        id: params.curr?.id || '',
        name,
        address,
      })
      .then(goBack);

  const removeHandler = async (): Promise<void> =>
    await addressBookService
      .removeAddressBookItemByAccountId(currentAccount?.id ?? '', params.curr?.id || '')
      .then(goBack);

  useEffect(() => nameInputRef.current?.focus(), [nameInputRef]);

  useEffect(() => {
    setAddressError(false);
    setErrorMsg('');
  }, [address]);

  useEffect(() => {
    setNameError(false);
    setErrorMsg('');
  }, [name]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>): void => {
    if (e.key === 'Enter' && Boolean(address) && Boolean(name)) {
      saveButtonClick();
    }
  };

  return (
    <Wrapper>
      <TopSection>
        <LeftArrowBtn onClick={goBack} />
        <Text type='header4'>{isAdd ? 'Add Address' : 'Edit Address'}</Text>
      </TopSection>
      <img
        className='symbol-image'
        src={isAdd ? add : edit}
        alt={isAdd ? 'add icon' : 'edit icon'}
      />
      <DefaultInput
        value={name}
        placeholder='Label'
        onChange={onChangeName}
        type='text'
        error={nameError}
        ref={nameInputRef}
      />
      <AddressInput
        value={address}
        placeholder='Address'
        onChange={onChangeAddress}
        onKeyDown={onKeyDown}
        rows={1}
        maxLength={40}
        autoComplete='off'
        error={addressError}
      />
      <ErrorText text={errorMsg} />
      {!isAdd && (
        <RemoveAddressBtn error={Boolean(errorMsg)} onClick={removeHandler}>
          <Text type='body1Reg' color={theme.neutral.a}>
            Remove Address
          </Text>
        </RemoveAddressBtn>
      )}
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: goBack }}
        confirmButtonProps={{
          onClick: saveButtonClick,
          text: 'Save',
          props: { disabled: Boolean(!address || !name) },
        }}
      />
    </Wrapper>
  );
};

const RemoveAddressBtn = styled.button<{ error: boolean }>`
  text-decoration-line: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
  text-decoration-color: ${getTheme('neutral', 'a')};
  position: absolute;
  bottom: 91px;
`;

const AddressInput = styled.textarea<{ error: boolean }>`
  ${inputStyle};
  height: 70px;
  overflow: hidden;
  resize: none;
  border: 1px solid ${({ error, theme }): string => (error ? theme.red._5 : theme.neutral._7)};
  margin-top: 12px;
`;

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  padding-top: 24px;
  width: 100%;
  height: 100%;
  .symbol-image {
    margin: 24px auto;
    display: block;
  }
`;

const TopSection = styled.div`
  ${mixins.flex({ direction: 'row' })}
  position: relative;
  width: 100%;
  & > button {
    position: absolute;
    left: 0;
  }
`;

export default AddAddress;
