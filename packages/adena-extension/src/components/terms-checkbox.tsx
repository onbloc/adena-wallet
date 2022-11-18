import React from 'react';
import styled from 'styled-components';
import checkOff from '../assets/check-off.svg';
import checkOn from '../assets/check-on.svg';
import checkBorder from '../assets/check-border.svg';
interface TermsCheckboxProps {
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  text?: string;
  children?: React.ReactNode;
  tabIndex: number;
}

const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'flex-start')};
  width: 100%;
  margin: auto 0px 10px;
  ${({ theme }) => theme.fonts.body1Reg};
`;

const Label = styled.label`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'flex-start')};
  cursor: pointer;
  &:before {
    content: '';
    display: inline-block;
    width: 20px;
    height: 20px;
    margin-right: 12px;
    background: url(${checkOff}) no-repeat center center;
  }
  .terms-button {
    text-decoration-line: underline;
    text-underline-offset: 2px;
    text-decoration-thickness: 1px;
  }
  &,
  * {
    font: inherit;
    color: ${({ theme }) => theme.color.neutral[9]};
  }
`;

const Input = styled.input`
  &[type='checkbox'] {
    width: 0px;
    height: 0px;
    &:checked + label:before {
      background: url(${checkOn}) no-repeat center center;
    }
    &:focus:not(:checked) + label:before {
      background: url(${checkBorder}) no-repeat center center;
    }
  }
`;

const TermsCheckbox = ({ checked, onChange, text, children, tabIndex }: TermsCheckboxProps) => {
  return (
    <Wrapper>
      <Input
        id='terms'
        type='checkbox'
        value='checkbox'
        checked={checked}
        onChange={onChange}
        tabIndex={tabIndex}
      />
      <Label htmlFor='terms'>
        {text && text}
        {children}
      </Label>
    </Wrapper>
  );
};

export default TermsCheckbox;
