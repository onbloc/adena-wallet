import styled from 'styled-components';

import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

export const OfflineBannerWrapper = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'flex-start' })};
  width: 100%;
  padding: 8px 12px;
  gap: 8px;
  background: ${getTheme('neutral', '_9')};
  border-bottom: 1px solid ${getTheme('neutral', '_7')};
  text-align: left;

  .indicator {
    ${mixins.flex({ direction: 'row' })};
    flex: 0 0 auto;

    /* The shared spinner icon animates itself. Hold it still for viewers who
       ask for reduced motion, but keep it on screen as a state indicator. */
    @media (prefers-reduced-motion: reduce) {
      svg {
        animation: none;
        opacity: 0.6;
      }
    }
  }

  .message {
    ${fonts.body3Reg};
    flex: 1;
    color: ${getTheme('neutral', '_3')};
  }

  .headline {
    ${fonts.body3Bold};
    color: ${getTheme('webWarning', '_100')};
  }

  .action-button {
    ${fonts.body3Reg};
    flex: 0 0 auto;
    padding: 0 12px;
  }
`;
