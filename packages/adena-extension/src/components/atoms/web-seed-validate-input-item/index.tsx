import { fonts, webFonts } from '@styles/theme';
import React, { useCallback, useMemo, useState } from 'react';
import styled, { css, RuleSet } from 'styled-components';
import { Row, View } from '../base';

interface StyleProps {
  hover?: boolean;
  focus?: boolean;
  filled?: boolean;
  error: boolean;
}

const forwardConfig = (prop: string): boolean => {
  return !['hover', 'focus', 'filled', 'error'].includes(prop);
};

const StyledContainer = styled(Row).withConfig({ shouldForwardProp: forwardConfig })<StyleProps>`
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
  
  ${({ filled }): RuleSet | string =>
    filled
      ? css`
          box-shadow:
            0px 0px 0px 3px rgba(255, 255, 255, 0.04),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `
      : ''}

  ${({ theme, error }): RuleSet | string =>
    error
      ? css`
          color: ${theme.webError._100};
          background: #e0517014;
          border-color: ${theme.webError._200};
          box-shadow:
            0px 0px 0px 3px rgba(235, 84, 94, 0.12),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `
      : ''}
`;

const StyledTitle = styled(View).withConfig({
  shouldForwardProp: (prop): boolean => !['hover', 'focus', 'filled', 'error'].includes(prop),
})<StyleProps>`
  width: 90px;
  height: 100%;
  background: ${({ theme }): string => theme.webInput._100};
  border-right: 1px solid ${({ theme }): string => theme.webNeutral._800};
  align-items: center;
  justify-content: center;
  color: ${({ theme }): string => theme.webNeutral._500};
  ${fonts.body2Reg}

  ${({ theme, hover, focus }): RuleSet | string =>
    hover || focus
      ? css`
          border-color: ${theme.webNeutral._600};
        `
      : ''}

  ${({ theme, error }): RuleSet | string =>
    error
      ? css`
          color: ${({ theme }): string => theme.webNeutral._500};
          border-color: ${theme.webError._200};
        `
      : ''}
`;

const StyledInput = styled.input.withConfig({
  shouldForwardProp: (prop): boolean => !['hover', 'focus', 'filled', 'error'].includes(prop),
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
  color: ${({ theme }): string => theme.webNeutral._100};
`;

interface WebSeedValidateInputItemProps {
  index: number;
  value: string;
  error: boolean;
  onChange: (value: string) => void;
}

export const WebSeedValidateInputItem: React.FC<WebSeedValidateInputItemProps> = ({
  index,
  value,
  error,
  onChange,
}) => {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);

  const filled = useMemo(() => {
    return value.length > 0;
  }, [value]);

  const keyName = useMemo(() => {
    return `Word #${index + 1}`;
  }, [index]);

  const onChangeInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      onChange(value);
    },
    [onChange],
  );

  return (
    <StyledContainer
      hover={hover}
      focus={focus}
      filled={filled}
      error={error}
      onMouseOver={(): void => setHover(true)}
      onMouseOut={(): void => setHover(false)}
    >
      <StyledTitle hover={hover} focus={focus} filled={filled} error={error}>
        {keyName}
      </StyledTitle>
      <StyledInput
        hover={hover}
        focus={focus}
        filled={filled}
        value={value}
        onFocus={(): void => setFocus(true)}
        onBlur={(): void => setFocus(false)}
        onChange={onChangeInput}
        error={error}
      />
    </StyledContainer>
  );
};
