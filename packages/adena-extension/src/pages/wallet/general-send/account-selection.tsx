import React, { Ref, useRef, useState } from 'react';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import Icon from '@components/icons';
import styled from 'styled-components';

interface Props {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  error: boolean;
  setAddress: React.Dispatch<React.SetStateAction<string>>;
  textAreaRef: Ref<unknown>;
}

const AccountSelection = (state: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSelectClicked, setIsSelectClicked] = useState(false);

  const selectionOpenHandler = () => setIsOpen((prev: boolean) => !prev);
  const selectionCloseHandler = () => {
    state.setAddress('');
    setIsSelectClicked(false);
  };

  return (
    <Wrapper ref={wrapperRef} error={state.error}>
      <TextFieldWrap error={state.error} isOpen={isOpen}>
        <input
          value={state.value}
          placeholder='Recipient’s GNOT Address'
          onChange={state.onChange}
          onKeyDown={state.onKeyDown}
          maxLength={40}
          className='input'
        />
        {isOpen ? (
          <Button width='38px' height='25px' radius='12.5px' onClick={selectionOpenHandler}>
            <Icon name='iconAddressBookLarge' className='icon-open-selection' />
          </Button>
        ) : isSelectClicked ? (
          <Button width='38px' height='25px' radius='12.5px' onClick={selectionCloseHandler}>
            <Icon name='iconCancel' />
          </Button>
        ) : (
          <Button
            hierarchy={ButtonHierarchy.Primary}
            width='38px'
            height='25px'
            radius='12.5px'
            onClick={selectionOpenHandler}
          >
            <Icon name='iconAddressBookSmall' />
          </Button>
        )}
      </TextFieldWrap>
    </Wrapper>
  );
};

const Wrapper = styled.div<{ error: boolean }>`
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
    if (error && !isOpen) return theme.color.red[2];
    if (isOpen && !error) return theme.color.primary[3];
    if (!error && !isOpen) return theme.color.neutral[3];
  }};
  background-color: ${({ theme }) => theme.color.neutral[8]};
  padding: 12.5px 16px;
  height: 48px;
  .icon-open-selection {
    width: 21px;
    height: 21px;
  }
`;

export default AccountSelection;
