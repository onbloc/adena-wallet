import styled from 'styled-components';

import mixins from '@styles/mixins';

export const WebMain = styled.main`
  ${mixins.flex({ align: 'center' })}
  width: fit-content;
  height: calc(100vh);
  margin: -80px auto 0;
  row-gap: 24px;
`;
