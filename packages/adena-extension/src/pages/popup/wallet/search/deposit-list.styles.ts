import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  padding-bottom: 120px;
`;

export const HeaderWrap = styled.div`
  width: 100%;
  margin-bottom: 24px;
`;

export const ChainList = styled.ul`
  ${mixins.flex({ direction: 'column' })};
  gap: 8px;
  width: 100%;
  list-style: none;
  margin: 0;
  padding: 0;
`;

export const ChainItem = styled.li`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
  padding: 12px 16px;
  gap: 12px;
  background-color: ${getTheme('neutral', '_7')};
  border-radius: 18px;

  .chain-left {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-start' })};
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .chain-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .chain-text {
    ${mixins.flex({ direction: 'column', align: 'flex-start', justify: 'center' })};
    gap: 2px;
    min-width: 0;
  }

  .chain-name {
    ${fonts.body2Bold};
    color: ${getTheme('neutral', '_1')};
  }

  .chain-address {
    ${fonts.captionReg};
    color: ${getTheme('neutral', 'a')};
  }

  .chain-right {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-end' })};
    gap: 6px;
    flex-shrink: 0;
  }
`;

export const IconButtonShell = styled.div`
  ${mixins.flex({ align: 'center', justify: 'center' })};
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: ${getTheme('neutral', '_6')};
  cursor: pointer;
  transition: background-color 0.15s ease;

  && svg path {
    transition: stroke 0.15s ease;
    stroke: ${getTheme('neutral', '_1')};
  }

  &:hover {
    background-color: ${getTheme('neutral', '_5')};
  }
`;

export const QRIconButton = styled.button`
  ${mixins.flex({ align: 'center', justify: 'center' })};
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background-color: ${getTheme('neutral', '_6')};
  cursor: pointer;
  transition: background-color 0.15s ease;

  svg path {
    transition: stroke 0.15s ease;
    stroke: ${getTheme('neutral', '_1')};
  }

  &:hover {
    background-color: ${getTheme('neutral', '_5')};
  }
`;

export const ButtonWrap = styled.div`
  ${mixins.flex({ direction: 'row' })};
  position: fixed;
  bottom: 0px;
  left: 0px;
  width: 100%;
  height: 96px;
  padding: 0px 20px;
  box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);
  background-color: ${getTheme('neutral', '_8')};
  z-index: 1;
`;
