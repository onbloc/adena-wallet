import styled from 'styled-components';

import mixins from '@styles/mixins';
import { WEB_CONTENT_WIDTH } from '@common/constants/ui.constant';

interface WebMainProps {
  width?: React.CSSProperties['width'],
  spacing?: number,
}

export const WebMain = styled.main<WebMainProps>`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })}
  width: ${({ width }): React.CSSProperties['width'] => width ?? `${WEB_CONTENT_WIDTH}px`};
  height: calc(100vh - 80px);
  margin: 0 auto 0;
  row-gap: 24px;
  padding-top: ${({ spacing }): string => spacing ? `${spacing - 80}px` : 'auto'};
`;
