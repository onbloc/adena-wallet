import styled from 'styled-components';

import mixins from '@styles/mixins';

export const WebMain = styled.main`
  ${mixins.flex({ align: 'center' })}
  width: fit-content;
  height: calc(100vh - 80px);
  margin: 0 auto;
  row-gap: 24px;
`;
