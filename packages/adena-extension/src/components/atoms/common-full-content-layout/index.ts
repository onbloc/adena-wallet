import mixins from '@styles/mixins';
import styled from 'styled-components';

export const CommonFullContentLayout = styled.section`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  position: relative;
  width: 100%;
  height: calc(100vh - 48px);
`;
