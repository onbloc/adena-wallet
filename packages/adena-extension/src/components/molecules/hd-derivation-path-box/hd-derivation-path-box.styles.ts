import styled from 'styled-components';

import { WebInput } from '@components/atoms';
import { getTheme } from '@styles/theme';

export const StyledHDDerivationPathBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 20px 20px 16px;
  border-radius: 14px;
  border: 1px solid ${getTheme('webNeutral', '_800')};
  background-color: ${getTheme('webNeutral', '_900')};
`;

export const StyledHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`;

export const StyledCloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
`;

export const StyledPathRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const StyledSegmentInput = styled(WebInput)`
  width: 100px;
  border-radius: 10px;
  padding: 12px;
  text-align: left;
`;
