import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import logo from '../../../../assets/gnot-logo.svg';
import { LeftArrowBtn } from '@ui/common/Button/ArrowButtons';
import Typography, { textVariants } from '@ui/common/Typography';
import { modeVariants } from '@ui/common/Button/FullButton';
import { ErrorText } from '@ui/common/ErrorText';
import DefaultInput, { inputStyle } from '@ui/common/DefaultInput';
import { useGeneralSend } from './useGeneralSend';
import CancelAndConfirmButton from '@ui/common/Button/CancelAndConfirmButton';

interface InputProps {
  address?: string;
  amount?: number | string;
  error?: boolean;
}

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  img {
    width: 100px;
    height: 100px;
    margin: 30px 0px;
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

const Textarea = styled.textarea<InputProps>`
  ${inputStyle};
  border: 1px solid ${({ error, theme }) => (error ? theme.color.red[2] : theme.color.neutral[4])};
  overflow: hidden;
  resize: none;
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
    ${textVariants.body2Reg};
    width: 63px;
    height: 24px;
    border-radius: 13px;
    color: ${({ theme }) => theme.color.neutral[0]};
    margin-left: 8px;
  }
`;

export const GeneralSendView = () => {
  const { addressState, amountState, buttonState, textAreaRef, onKeyDown } = useGeneralSend();

  return (
    <Wrapper>
      <HeaderWrap>
        {buttonState.prev.show && <LeftArrowBtn onClick={buttonState.prev.onClick} />}
        <Typography type='header4'>Send GNOT</Typography>
      </HeaderWrap>
      <img src={logo} alt='nft logo' />
      <InputWrap>
        <Textarea
          ref={textAreaRef}
          name='address'
          value={addressState.value}
          placeholder='Recipient’s GNOT Address'
          onChange={addressState.onChange}
          onKeyDown={onKeyDown}
          rows={1}
          maxLength={40}
          error={addressState.error}
          autoComplete='off'
        />
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
            <Typography type='body2Reg'>GNOT</Typography>
            <button type='button' onClick={buttonState.max}>
              Max
            </button>
          </RightButtonBox>
        </AmountBox>
        {amountState.error && <ErrorText text={amountState.errorMessage} />}
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
