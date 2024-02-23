import styled, { css, FlattenSimpleInterpolation } from 'styled-components';

import mixins from '@styles/mixins';
import { WEB_CONTENT_WIDTH } from '@common/constants/ui.constant';

interface WebMainProps {
  width?: React.CSSProperties['width'];
  spacing?: number | null;
  responsiveSpacing?: number | null;
}

export const WebMain = styled.main<WebMainProps>`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })}
  width: ${({ width }): React.CSSProperties['width'] => width ?? `${WEB_CONTENT_WIDTH}px`};
  margin: 0 auto 0;
  row-gap: 24px;

  ${({ spacing }): FlattenSimpleInterpolation =>
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

  ${({ responsiveSpacing }): FlattenSimpleInterpolation =>
    responsiveSpacing
      ? css`
          @media (max-width: 850px) {
            height: calc(100vh - 80px);
            padding-top: ${`${responsiveSpacing - 80}px`};
            justify-content: flex-start;
          }
        `
      : css``}
`;
