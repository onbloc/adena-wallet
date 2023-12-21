import theme, { fonts } from '@styles/theme';
import styled from 'styled-components';

export const MainManageTokenButtonWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  width: 156px;
  height: 24px;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    opacity: 0.7;
  }

  .icon {
    width: 24px;
    height: 24px;
    margin-right: 5px;
  }

  .title {
    color: ${theme.color.neutral[9]};
    ${fonts.body1Reg};
  }
`;
