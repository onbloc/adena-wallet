import { LeftArrowBtn } from '@components/buttons/arrow-buttons';
import React, { useCallback, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Text from '@components/text';
import { useEffect } from 'react';
import add from '../../../assets/add-symbol.svg';
import edit from '../../../assets/edit-symbol.svg';
import DefaultInput, { inputStyle } from '@components/default-input';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import { RoutePath } from '@router/path';
import { ErrorText } from '@components/error-text';
import theme from '@styles/theme';
import { ValidationService, WalletService } from '@services/index';
import { BookListProps } from '../address-book';
import { AddressBookValidationError } from '@common/errors/validation/address-book-validation-error';

const specialPatternCheck = /\W|\s/g;

const AddAddress = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const backButtonClick = () => navigate(-1);
  const isAdd = location?.state.status === 'add';
  const datas: BookListProps[] = location?.state?.datas;
  const [name, setName] = useState(() => location?.state?.curr?.name ?? '');
  const [address, setAddress] = useState(() => location?.state?.curr?.address ?? '');
  const [nameError, setNameError] = useState<boolean>(false);
  const [addressError, setAddressError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const onChangeAddress = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const patternCheck = e.target.value.replace(specialPatternCheck, '');
    setAddress(() => patternCheck.toLowerCase());
  };
  const onChangeName = (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value);

  const saveButtonClick = () => {
    let isValid = true;
    let errorMessage = '';
    const currData: BookListProps = {
      id: location?.state?.curr?.id ?? '',
      name: name,
      address: address,
      createdAt: location?.state?.curr?.createdAt ?? '',
    };

    try {
      ValidationService.validateInvalidAddress(address);
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
      ValidationService.validateAlreadyAddress(currData, datas, isAdd);
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
      ValidationService.validateAlreadyName(currData, datas, isAdd);
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

  const addHandler = async () =>
    await WalletService.addAddressBookItem(name, address).then(() => backButtonClick());
  const editHandler = async () =>
    await WalletService.updateAddressBookItem(location.state.curr.id, name, address).then(() =>
      backButtonClick(),
    );
  const removeHandler = async () =>
    await WalletService.removeAddressBookItem(location.state.curr.id).then(() => backButtonClick());

  useEffect(() => nameInputRef.current?.focus(), [nameInputRef]);
  useEffect(() => {
    setAddressError(false);
    setErrorMsg('');
  }, [address]);
  useEffect(() => {
    setNameError(false);
    setErrorMsg('');
  }, [name]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
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
  text-decoration-color: ${({ theme }) => theme.color.neutral[9]};
  position: absolute;
  bottom: 91px;
`;

const AddressInput = styled.textarea<{ error: boolean }>`
  ${inputStyle};
  height: 70px;
  overflow: hidden;
  resize: none;
  border: 1px solid ${({ error, theme }) => (error ? theme.color.red[2] : theme.color.neutral[6])};
  margin-top: 12px;
`;

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  padding-top: 24px;
  width: 100%;
  height: 100%;
  .symbol-image {
    margin: 24px auto;
    display: block;
  }
`;

const TopSection = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')}
  position: relative;
  width: 100%;
  & > button {
    position: absolute;
    left: 0;
  }
`;

export default AddAddress;
