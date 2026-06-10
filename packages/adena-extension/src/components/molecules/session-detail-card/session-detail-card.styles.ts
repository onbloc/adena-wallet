import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const CardContainer = styled.div`
  ${mixins.flex({ direction: 'column', align: 'stretch', justify: 'flex-start' })};
  width: 100%;
`;

export const Row = styled.div<{ $hideBorder?: boolean }>`
  ${mixins.flex({ direction: 'column', align: 'flex-start', justify: 'flex-start' })};
  padding: 14px 18px;
  border-top: ${({ $hideBorder, theme }): string =>
    $hideBorder ? 'none' : `1px solid ${theme.neutral._7}`};
  gap: 8px;

  &:first-child {
    border-top: none;
  }
`;

export const RowHeader = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
`;

export const RowLabel = styled.span`
  ${fonts.body2Reg};
  color: ${getTheme('neutral', 'a')};
`;

export const RowBody = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-start' })};
  width: 100%;
  gap: 6px;

  .crypto-icon {
    width: 17px;
    height: 17px;
  }
`;

export const RowValue = styled.span<{ $fontSize?: number }>`
  ${fonts.body2Reg};
  color: ${getTheme('neutral', '_1')};
  word-break: break-all;
  ${({ $fontSize }): string =>
    $fontSize ? `font-size: ${$fontSize}px; line-height: 22px;` : ''}
`;

export const RowMuted = styled.span`
  ${fonts.body3Reg};
  color: ${getTheme('neutral', 'a')};
`;

export const Chip = styled.span<{ $variant: 'info' | 'danger' }>`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'center' })};
  ${fonts.captionBold};
  height: 22px;
  padding: 0 10px;
  border-radius: 11px;
  gap: 4px;
  color: ${({ $variant, theme }): string =>
    $variant === 'danger' ? '#EB545E' : theme.primary._4};
  background: ${({ $variant }): string =>
    $variant === 'danger' ? 'rgba(239, 45, 33, 0.18)' : 'rgba(55, 125, 255, 0.18)'};
  flex-shrink: 0;

  svg {
    width: ${({ $variant }): string => ($variant === 'danger' ? '12px' : '14px')};
    height: ${({ $variant }): string => ($variant === 'danger' ? '12px' : '14px')};
  }
`;

export const LinkButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: #777777;
  flex-shrink: 0;

  &:hover {
    color: #ffffff;
  }

  svg {
    width: 14px;
    height: 14px;
  }

  svg path {
    fill: currentColor;
  }
`;

export const RealmList = styled.div`
  ${mixins.flex({ direction: 'column', align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  gap: 6px;
`;

export const RealmRow = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-start' })};
  width: 100%;
  gap: 6px;
`;
