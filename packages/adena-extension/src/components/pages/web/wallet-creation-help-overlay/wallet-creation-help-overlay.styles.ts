import { webFonts } from '@styles/theme';
import styled from 'styled-components';

export const WalletCreationHelpOverlayItem = styled.span`
  color: ${({ theme }): string => theme.webNeutral._100};
  word-break: keep-all;
  white-space: nowrap;
  ${webFonts.body4}

  b {
    font-weight: 600;
  }
`;
