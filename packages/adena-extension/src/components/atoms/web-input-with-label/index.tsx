import { webFonts } from '@styles/theme';
import React, { useState } from 'react';
import styled, { css, RuleSet } from 'styled-components';
import { Row, View } from '@components/atoms';

interface StyleProps {
  hover?: boolean;
  focus?: boolean;
  filled?: boolean;
  error?: boolean;
  disabled?: boolean;
}

const StyledContainer = styled(Row).withConfig({
  shouldForwardProp: (prop): boolean =>
    !['hover', 'focus', 'filled', 'error', 'disabled'].includes(prop),
})<StyleProps>`
  width: 100%;
  height: 40px;
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid ${({ theme }): string => theme.webNeutral._800};
  ${webFonts.body4}

  ${({ theme, hover, focus, filled }): RuleSet | string =>
    hover || focus || filled
      ? css`
          border-color: ${theme.webNeutral._600};
        `
      : ''}
  
  ${({ filled, disabled }): RuleSet | string =>
    filled && !disabled
      ? css`
          box-shadow:
            0px 0px 0px 3px rgba(255, 255, 255, 0.04),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `
      : ''}

  ${({ theme, error, disabled }): RuleSet | string =>
    error && !disabled
      ? css`
          background: #e0517014;
          border-color: ${theme.webError._200};
          box-shadow:
            0px 0px 0px 3px rgba(235, 84, 94, 0.12),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `
      : ''}
`;

const StyledLabel = styled(View).withConfig({
  shouldForwardProp: (prop): boolean =>
    !['hover', 'focus', 'filled', 'error', 'disabled'].includes(prop),
})<StyleProps>`
  min-width: 106px;
  height: 100%;
  padding: 0 16px;
  background: ${({ theme }): string => theme.webInput._100};
  border-right: 1px solid ${({ theme }): string => theme.webNeutral._800};
  align-items: center;
  justify-content: center;
  color: ${({ theme }): string => theme.webNeutral._500};
  white-space: nowrap;

  ${({ theme, hover, focus }): RuleSet | string =>
    hover || focus
      ? css`
          border-color: ${theme.webNeutral._600};
        `
      : ''}

  ${({ theme, error, disabled }): RuleSet | string =>
    error && !disabled
      ? css`
          color: ${theme.webError._100};
          background: rgba(224, 81, 112, 0.08);
          border-color: ${theme.webError._200};
        `
      : ''}
`;

const StyledInput = styled.input.withConfig({
  shouldForwardProp: (prop): boolean =>
    !['hover', 'focus', 'filled', 'error', 'disabled'].includes(prop),
})<StyleProps>`
  flex: 1;
  width: 100%;
  height: 40px;
  padding: 12px;
  border-radius: 0;
  border: none;
  outline: none;
  box-shadow: none;
  background: ${({ error, theme }): string =>
    error ? theme.webError._300 : theme.webNeutral._900};
  color: ${({ theme, disabled }): string =>
    disabled ? theme.webNeutral._600 : theme.webNeutral._100};

  &::placeholder {
    color: ${({ theme }): string => theme.webNeutral._600};
  }

  &:disabled {
    cursor: default;
  }
`;

interface WebInputWithLabelProps {
  label: string;
  value: string;
  error?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const WebInputWithLabel: React.FC<WebInputWithLabelProps> = ({
  label,
  value,
  error = false,
  disabled = false,
  onChange,
  placeholder,
}) => {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const filled = value.length > 0;

  return (
    <StyledContainer
      hover={hover && !disabled}
      focus={focus && !disabled}
      filled={filled}
      error={error && !disabled}
      disabled={disabled}
      onMouseOver={(): false | void => !disabled && setHover(true)}
      onMouseOut={(): false | void => !disabled && setHover(false)}
    >
      <StyledLabel
        hover={hover && !disabled}
        focus={focus && !disabled}
        filled={filled}
        error={error && !disabled}
        disabled={disabled}
      >
        {label}
      </StyledLabel>
      <StyledInput
        hover={hover && !disabled}
        focus={focus && !disabled}
        filled={filled}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onFocus={(): false | void => !disabled && setFocus(true)}
        onBlur={(): false | void => !disabled && setFocus(false)}
        onChange={(e): false | void => !disabled && onChange(e.target.value)}
        error={error && !disabled}
        disabled={disabled}
      />
    </StyledContainer>
  );
};
