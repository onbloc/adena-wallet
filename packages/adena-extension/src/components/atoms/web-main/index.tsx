import styled, { css, RuleSet } from 'styled-components';

import { WEB_CONTENT_WIDTH } from '@common/constants/ui.constant';
import mixins from '@styles/mixins';

interface WebMainProps {
  width?: React.CSSProperties['width'];
  spacing?: number | null;
  responsiveSpacing?: number | null;
}

export const WebMain = styled.main.withConfig({
  shouldForwardProp: (prop): boolean => !['width', 'spacing', 'responsiveSpacing'].includes(prop),
})<WebMainProps>`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })}
  width: ${({ width }): React.CSSProperties['width'] => width ?? `${WEB_CONTENT_WIDTH}px`};
  margin: 0 auto 0;
  row-gap: 24px;

  ${({ spacing }): RuleSet =>
    spacing
      ? css`
          height: calc(100vh - 80px);
          padding-top: ${`${spacing - 80}px`};
          justify-content: flex-start;
        `
      : css`
          height: 100vh;
          margin-top: -80px;
          justify-content: center;
        `}

  ${({ responsiveSpacing }): RuleSet =>
    responsiveSpacing
      ? css`
          @media (max-height: 850px) {
            height: calc(100vh - 80px);
            padding-top: ${`${responsiveSpacing - 80}px`};
            justify-content: flex-start;
          }
        `
      : css``}
`;
