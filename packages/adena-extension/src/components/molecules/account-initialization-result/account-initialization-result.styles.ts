import { View } from '@components/atoms';
import mixins from '@styles/mixins';
import styled from 'styled-components';

export const AccountInitializationResultWrapper = styled(View)`
  ${mixins.flex({ align: 'center', justify: 'center' })};
  width: 100%;
  height: auto;
  gap: 24px;
  padding: 56px 20px 20px;

  .image-wrapper {
    ${mixins.flex({ align: 'center', justify: 'center' })};
    width: 100%;
    height: 100%;

    img {
      width: 100px;
      height: 100px;
    }
  }

  .content-wrapper {
    ${mixins.flex({ direction: 'column', align: 'center', justify: 'center' })};
    width: 100%;
    height: auto;

    .content > * {
      text-align: center;
    }
  }
`;
