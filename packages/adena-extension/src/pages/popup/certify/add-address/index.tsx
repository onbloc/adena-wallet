import React, { useRef, useState, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';

import {
  DefaultInput,
  ErrorText,
  inputStyle,
  LeftArrowBtn,
  Text,
} from '@components/atoms';
import {
  ChainDropdown,
  chainOptionsFromRegistry,
} from '@components/atoms/chain-dropdown';
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
import { useChain } from '@hooks/use-chain';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import mixins from '@styles/mixins';
import { AddressBookItem } from '@repositories/wallet';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';
import { useAddressBook } from '@hooks/use-address-book';
import { inferChainGroup } from '@common/utils/address-chain';

const specialPatternCheck = /\W|\s/g;
const ACCOUNT_NAME_LENGTH_LIMIT = 23;

const AddAddress = (): JSX.Element => {
  const theme = useTheme();
  const { wallet } = useWalletContext();
  const { params, goBack } = useAppNavigate<RoutePath.AddAddress>();
  const isAdd = params.status === 'add';

  const addressList: AddressBookItem[] = params.addressList;
  const [chainGroup, setChainGroup] = useState<string>(() =>
    inferChainGroup(params.curr?.address ?? ''),
  );
  const chain = useChain(chainGroup);
  const { chainRegistry } = useAdenaContext();
  const chainOptions = React.useMemo(
    () => chainOptionsFromRegistry(chainRegistry),
    [chainRegistry],
  );
  // Bech32 length: prefix + "1" separator + 32 data chars + 6 checksum chars.
  // Use the longest registered prefix so pasting an address whose chain
  // differs from the current selection isn't truncated before useEffect
  // re-syncs chainGroup from the new prefix.
  const addressMaxLength = React.useMemo(() => {
    const prefixes = chainRegistry.listChains().map((c) => c.bech32Prefix.length);
    const maxPrefix = prefixes.length > 0 ? Math.max(...prefixes) : chain.bech32Prefix.length;
    return maxPrefix + 39;
  }, [chainRegistry, chain.bech32Prefix.length]);
  const [name, setName] = useState(() => params.curr?.name ?? '');
  const [address, setAddress] = useState(() => params.curr?.address ?? '');
  const [nameError, setNameError] = useState<boolean>(false);
  const [addressError, setAddressError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { addAddressBookItem, editAddressBookItem, removeAddressBookItem } = useAddressBook();

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

  const saveButtonClick = async (): Promise<void> => {
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
      await validateAlreadyAddressByAccounts(currData, wallet?.accounts ?? [], isAdd, chain.bech32Prefix);
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

  const addHandler = async (): Promise<void> => {
    addAddressBookItem(name, address);
    goBack();
  };

  const editHandler = async (): Promise<void> => {
    editAddressBookItem(params.curr?.id || '', name, address);
    goBack();
  };

  const removeHandler = async (): Promise<void> => {
    removeAddressBookItem(params.curr?.id || '');
    goBack();
  };

  useEffect(() => nameInputRef.current?.focus(), [nameInputRef]);

  useEffect(() => {
    setAddressError(false);
    setErrorMsg('');
    setChainGroup(inferChainGroup(address));
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
      <ScrollableContent>
        <img
          className='symbol-image'
          src={isAdd ? add : edit}
          alt={isAdd ? 'add icon' : 'edit icon'}
        />
        <ChainDropdown
          value={chainGroup}
          onChange={setChainGroup}
          options={chainOptions}
          disabled={!isAdd}
        />
        <DefaultInput
          value={name}
          placeholder='Label'
          onChange={onChangeName}
          type='text'
          error={nameError}
          ref={nameInputRef}
          margin='12px 0 0'
        />
        <AddressInput
          value={address}
          placeholder='Address'
          onChange={onChangeAddress}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={addressMaxLength}
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
      </ScrollableContent>
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
  align-self: center;
  margin-top: ${({ error }): string => (error ? '8px' : '16px')};
  margin-bottom: 24px;
`;

const AddressInput = styled.textarea<{ error: boolean }>`
  ${inputStyle};
  min-height: 70px;
  height: auto;
  overflow: hidden;
  resize: none;
  word-break: break-all;
  border: 1px solid ${({ error, theme }): string => (error ? theme.red._5 : theme.neutral._7)};
  margin-top: 12px;
`;

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  padding-top: 24px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  .symbol-image {
    margin: 24px auto;
    display: block;
  }
`;

const ScrollableContent = styled.div`
  ${mixins.flex({ justify: 'flex-start' })};
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 16px;
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
