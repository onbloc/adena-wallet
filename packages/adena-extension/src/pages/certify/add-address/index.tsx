import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { CSSProp } from 'styled-components';

import { Text, DefaultInput, inputStyle, ErrorText, LeftArrowBtn } from '@components/atoms';
import { CancelAndConfirmButton } from '@components/molecules';
import add from '@assets/add-symbol.svg';
import edit from '@assets/edit-symbol.svg';
import theme from '@styles/theme';
import {
  validateAlreadyAddress,
  validateAlreadyAddressByAccounts,
  validateAlreadyName,
  validateInvalidAddress,
} from '@services/index';
import { BookListProps } from '../address-book';
import { AddressBookValidationError } from '@common/errors/validation/address-book-validation-error';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

const specialPatternCheck = /\W|\s/g;
const ACCOUNT_NAME_LENGTH_LIMIT = 23;

const AddAddress = (): JSX.Element => {
  const { wallet } = useWalletContext();
  const { addressBookService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const backButtonClick = (): void => navigate(-1);
  const isAdd = location?.state.status === 'add';
  const datas: BookListProps[] = location?.state?.datas;
  const [name, setName] = useState(() => location?.state?.curr?.name ?? '');
  const [address, setAddress] = useState(() => location?.state?.curr?.address ?? '');
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
    const currData: BookListProps = {
      id: location?.state?.curr?.id ?? '',
      name: name,
      address: address,
      createdAt: location?.state?.curr?.createdAt ?? '',
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
      validateAlreadyAddress(currData, datas, isAdd);
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
      validateAlreadyName(currData, datas, isAdd);
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
    await addressBookService.addAddressBookItem({ name, address }).then(() => backButtonClick());

  const editHandler = async (): Promise<void> =>
    await addressBookService
      .updateAddressBookItemById({
        id: location.state.curr.id,
        name,
        address,
      })
      .then(() => backButtonClick());

  const removeHandler = async (): Promise<void> =>
    await addressBookService
      .removeAddressBookItemByAccountId(currentAccount?.id ?? '', location.state.curr.id)
      .then(() => backButtonClick());

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
        <LeftArrowBtn onClick={backButtonClick} />
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
          <Text type='body1Reg' color={theme.color.neutral[9]}>
            Remove Address
          </Text>
        </RemoveAddressBtn>
      )}
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: backButtonClick }}
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
  text-decoration-color: ${({ theme }): string => theme.color.neutral[9]};
  position: absolute;
  bottom: 91px;
`;

const AddressInput = styled.textarea<{ error: boolean }>`
  ${inputStyle};
  height: 70px;
  overflow: hidden;
  resize: none;
  border: 1px solid
    ${({ error, theme }): string => (error ? theme.color.red[2] : theme.color.neutral[6])};
  margin-top: 12px;
`;

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')};
  padding-top: 24px;
  width: 100%;
  height: 100%;
  .symbol-image {
    margin: 24px auto;
    display: block;
  }
`;

const TopSection = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')}
  position: relative;
  width: 100%;
  & > button {
    position: absolute;
    left: 0;
  }
`;

export default AddAddress;
