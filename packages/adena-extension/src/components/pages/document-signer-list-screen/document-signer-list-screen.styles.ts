import styled from 'styled-components';
import mixins from '@styles/mixins';

export const DocumentSignerListWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;

  & .content-wrapper {
    ${mixins.flex({ direction: 'column', justify: 'space-between' })};
    width: 100%;
    margin-top: 20px;
  }

  & .settings-wrapper {
    ${mixins.flex({ align: 'normal', justify: 'normal' })};
    width: 100%;
    gap: 10px;
  }
`;
