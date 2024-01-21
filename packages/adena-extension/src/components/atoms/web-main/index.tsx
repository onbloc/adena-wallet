import styled from 'styled-components';

import mixins from '@styles/mixins';

export const WebMain = styled.main`
  ${mixins.flex({ align: 'flex-start' })}
  padding-top: 232px;
  width: fit-content;
  margin: 0 auto;
  row-gap: 24px;
`;
