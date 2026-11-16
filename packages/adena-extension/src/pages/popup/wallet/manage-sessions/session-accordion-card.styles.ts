import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const Card = styled.div`
  ${mixins.flex({ direction: 'column', align: 'stretch', justify: 'flex-start' })};
  width: 100%;
  background-color: ${getTheme('neutral', '_9')};
  border: none;
  border-radius: 12px;
  overflow: hidden;
`;

export const Header = styled.div<{ $expanded: boolean }>`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
  padding: 14px 18px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;

  &:focus-visible {
    outline: 2px solid ${getTheme('primary', '_6')};
    outline-offset: -2px;
  }

  .left {
    ${mixins.flex({ direction: 'column', align: 'flex-start', justify: 'flex-start' })};
    gap: 6px;
  }

  .session-name {
    ${fonts.body2Bold};
    color: #777777;
  }

  .address-row {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-start' })};
    gap: 6px;
  }

  .address {
    ${fonts.body2Reg};
    color: #ffffff;
  }

  .chevron {
    transition: transform 0.15s ease;
    transform: rotate(${({ $expanded }): string => ($expanded ? '180deg' : '0deg')});
    color: ${getTheme('neutral', 'a')};
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .address-share {
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
  }
`;

export const ExpandedSection = styled.div`
  ${mixins.flex({ direction: 'column', align: 'stretch', justify: 'flex-start' })};
  border-top: none;
`;

export const RevokeRow = styled.button`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'center' })};
  width: fit-content;
  align-self: center;
  padding: 11px 0;
  gap: 6px;
  background: transparent;
  border: none;
  color: #777777;
  cursor: pointer;
  ${fonts.body2Reg};

  svg {
    width: 17px;
    height: 17px;
  }

  &:hover {
    color: #ffffff;
    background: transparent;
  }
`;
