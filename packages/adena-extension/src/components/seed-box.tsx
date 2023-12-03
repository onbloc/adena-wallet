import React from 'react';
import styled, { CSSProp, FlattenSimpleInterpolation, css } from 'styled-components';
import BlurScreen from './blur-screen';
import Text from './text';
interface SeedScrollBoxProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  error?: boolean;
  scroll: boolean;
  seeds?: string[] | string;
  hasBlurScreen?: boolean;
  hasBlurText?: boolean;
  blurScreenText?: string;
  className?: string;
}

const Wrapper = styled.div<{ error: boolean; scroll: boolean }>`
  position: relative;
  width: 100%;
  height: 140px;
  border: 1px solid
    ${({ error, theme }): string => (error ? theme.color.red[2] : theme.color.neutral[6])};
  background-color: ${({ theme }): string => theme.color.neutral[8]};
  border-radius: 18px;
  ${({ scroll }): CSSProp =>
    scroll
      ? css`
          overflow-y: auto;
          padding: 14px 16px 8px;
          margin-top: 20px;
        `
      : css`
          padding: 8px;
        `}
`;

const Inner = styled.div`
  width: 100%;
  height: 100%;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 20px;
  padding: 10px 18px;
  .seed-text {
    ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')}
  }
`;

const Textarea = styled.textarea`
  ${({ theme }): FlattenSimpleInterpolation => theme.fonts.body2Reg};
  width: 100%;
  word-wrap: break-word;
  background-color: inherit;
  border: none;
  outline: none;
  color: white;
  resize: none;
`;

const SeedBox = ({
  seeds,
  value,
  onChange,
  onKeyDown,
  error = false,
  scroll,
  hasBlurScreen = false,
  hasBlurText = false,
  blurScreenText = '',
  className = '',
}: SeedScrollBoxProps): JSX.Element => {
  return (
    <Wrapper error={error} scroll={scroll} className={className}>
      {scroll && (
        <Textarea rows={5} value={value} onChange={onChange} onKeyDown={onKeyDown} autoFocus />
      )}
      {Array.isArray(seeds) && (
        <Inner>
          {seeds?.map((seed: string) => (
            <Text className='seed-text' key={seed} type='captionReg'>
              {seed}
            </Text>
          ))}
        </Inner>
      )}
      {typeof seeds === 'string' && (
        <Text className='seed-text' type='captionReg'>
          {seeds}
        </Text>
      )}
      {hasBlurScreen && <BlurScreen hasText={hasBlurText} text={blurScreenText} />}
    </Wrapper>
  );
};

export default SeedBox;
