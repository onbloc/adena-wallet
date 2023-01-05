import React from 'react';
import styled from 'styled-components';
import logo from '../../../assets/gnot-logo.svg';
import { LeftArrowBtn } from '@components/buttons/arrow-buttons';
import Text from '@components/text';
import Button, { ButtonHierarchy, modeVariants } from '@components/buttons/button';
import { ErrorText } from '@components/error-text';
import DefaultInput from '@components/default-input';
import { useGeneralSend } from './use-general-send';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import Icon from '@components/icons';
import { useWalletBalances } from '@hooks/use-wallet-balances';
import { formatAddress, formatNickname } from '@common/utils/client-utils';
import theme from '@styles/theme';

export const GeneralSend = () => {
  const {
    addressState,
    amountState,
    buttonState,
    textAreaRef,
    onKeyDown,
    accountsList
  } = useGeneralSend();
  const [balances] = useWalletBalances();

  const existsAddressBookItems = () => {
    if (accountsList && accountsList.length > 0) {
      return true;
    }
    return false;
  };

  const renderBalancesMessage = () => {
    if (amountState.error) {
      return <ErrorText text={amountState.errorMessage} />;
    }
    return (
      <Text
        className='description'
        color='#777777'
        type='captionReg'
        textAlign='left'
      >{`Balance: ${balances[0]?.amount} ${balances[0]?.amountDenom}`}</Text>
    );
  };
  return (
    <Wrapper>
      <HeaderWrap>
        {buttonState.prev.show && <LeftArrowBtn onClick={buttonState.prev.onClick} />}
        <Text type='header4'>Send GNOT</Text>
      </HeaderWrap>
      <img src={logo} alt='nft logo' />
      <InputWrap>
        <AddrSelection ref={addressState.wrapperRef} error={addressState.error}>
          <TextFieldWrap error={addressState.error} isOpen={addressState.isOpen}>
            {addressState.isSelected ? (
              <SelectTextWrap>
                <Text type='body2Bold'>{formatNickname(addressState.selectName, 12)}</Text>
                <Text type='body2Reg' color={theme.color.neutral[9]}>{` (${formatAddress(
                  addressState.value,
                )})`}</Text>
              </SelectTextWrap>
            ) : (
              <Textarea
                ref={textAreaRef}
                name='address'
                value={addressState.value}
                placeholder='Recipient’s GNOT Address'
                onChange={addressState.onChange}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={40}
                autoComplete='off'
                isOpen={addressState.isOpen}
              />
            )}
            <Button
              hierarchy={ButtonHierarchy.Primary}
              width='38px'
              height='25px'
              radius='12.5px'
              onClick={
                addressState.isSelected
                  ? addressState.selectionClearHandler
                  : addressState.selectionOpenHandler
              }
            >
              <Icon name={addressState.isSelected ? 'iconCancel' : 'iconAddressBookSmall'} />
            </Button>
          </TextFieldWrap>
          {addressState.isOpen && (
            <SelectionBox isOpen={addressState.isOpen}>
              {existsAddressBookItems() ? (
                <>
                  {accountsList.length > 0 &&
                    accountsList.map((v: any, i: number) => (
                      <AccountBox
                        key={i}
                        onClick={() => addressState.selectAccountClickHandler(v.name, v.address)}
                      >
                        <Text type='body2Bold'>{formatNickname(v.name, 12)}</Text>
                        <Text type='body2Reg' color={theme.color.neutral[9]}>{` (${formatAddress(
                          v.address,
                        )})`}</Text>
                      </AccountBox>
                    ))}
                </>
              ) : (
                <Text className='no-address' type='body2Reg' color={theme.color.neutral[9]}>
                  No address registered
                </Text>
              )}
            </SelectionBox>
          )}
        </AddrSelection>
        {addressState.error && <ErrorText text={addressState.errorMessage} />}
        <AmountBox>
          <Input
            value={amountState.value}
            name='amount'
            type='number'
            placeholder='Amount'
            onChange={amountState.onChange}
            onKeyDown={onKeyDown}
            error={amountState.error}
            autoComplete='off'
          />
          <RightButtonBox>
            <Text type='body2Reg'>GNOT</Text>
            <Button
              hierarchy={ButtonHierarchy.Primary}
              width='63px'
              height='24px'
              radius='13px'
              margin='0px 0px 0px 8px'
              onClick={buttonState.max}
            >
              Max
            </Button>
          </RightButtonBox>
        </AmountBox>
        {renderBalancesMessage()}
      </InputWrap>
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: buttonState.cancel }}
        confirmButtonProps={{
          onClick: buttonState.next,
          text: 'Next',
          props: { disabled: buttonState.disabled },
        }}
      />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  img {
    width: 100px;
    height: 100px;
    margin: 30px 0px;
  }

  .description {
    width: 100%;
    padding-left: 16px;
  }
`;

const HeaderWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  position: relative;
  width: 100%;
  & > button {
    position: absolute;
    left: 0;
  }
`;

const InputWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'center')};
  width: 100%;
`;

const AddrSelection = styled.div<{ error: boolean }>`
  width: 100%;
  position: relative;
`;

const TextFieldWrap = styled.div<{ error: boolean; isOpen: boolean }>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  border-radius: 30px;
  border-top-left-radius: ${({ isOpen }) => (isOpen ? '24px' : '30px')};
  border-top-right-radius: ${({ isOpen }) => (isOpen ? '24px' : '30px')};
  border-bottom-left-radius: ${({ isOpen }) => (isOpen ? '0px' : '30px')};
  border-bottom-right-radius: ${({ isOpen }) => (isOpen ? '0px' : '30px')};
  border: 1px solid
    ${({ isOpen, error, theme }) => {
    if (isOpen) return theme.color.primary[3];
    if (error) return theme.color.red[2];
    return theme.color.neutral[6];
  }};
  background-color: ${({ theme }) => theme.color.neutral[8]};
  padding: 0 16px;
  min-height: 48px;
`;

const SelectTextWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'flex-start', false)};
  margin-right: 16px;
  flex: 1;
`;

const Textarea = styled.textarea<{ isOpen: boolean }>`
  ${({ theme }) => theme.fonts.body2Reg};
  overflow: hidden;
  resize: none;
  flex: 1;
  height: 100%;
  margin-right: 16px;
  padding: 12px 0px;
  ::placeholder {
    color: ${({ theme }) => theme.color.neutral[9]};
  }
`;

const SelectionBox = styled.div<{ isOpen: boolean }>`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  background-color: ${({ theme }) => theme.color.neutral[8]};
  width: 100%;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  border-left: 1px solid ${({ theme }) => theme.color.primary[3]};
  border-right: 1px solid ${({ theme }) => theme.color.primary[3]};
  border-bottom: 1px solid ${({ theme }) => theme.color.primary[3]};
  min-height: 48px;
  max-height: 144px;
  overflow-y: auto;
  position: absolute;
  z-index: 1;
  .no-address {
    ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
    height: 48px;
    cursor: default;
  }
`;

const AccountBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 48px;
  padding: 14px 16px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  cursor: pointer;
  :hover {
    background-color: ${({ theme }) => theme.color.neutral[6]};
  }
`;

const AmountBox = styled.div`
  width: 100%;
  position: relative;
  margin-top: 12px;
`;

const Input = styled(DefaultInput)`
  padding-right: 125px;
`;

const RightButtonBox = styled.div`
  ${({ theme }) => theme.mixins.posTopCenterRight('11px')};
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  & > button {
    ${modeVariants['primary']};
    ${({ theme }) => theme.fonts.body2Reg};
    width: 63px;
    height: 24px;
    border-radius: 13px;
    color: ${({ theme }) => theme.color.neutral[0]};
    margin-left: 8px;
  }
`;
