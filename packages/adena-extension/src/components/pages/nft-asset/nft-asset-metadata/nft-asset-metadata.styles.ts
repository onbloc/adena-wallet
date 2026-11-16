import { View } from '@components/atoms';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const NFTAssetMetadataWrapper = styled(View)`
  width: 100%;
  height: auto;
  flex-shrink: 0;
  margin-top: 8px;
  gap: 20px;

  .title {
    color: ${getTheme('neutral', '_2')};
    ${fonts.body1Reg};
  }

  .content {
    color: ${getTheme('neutral', 'a')};
    ${fonts.body2Reg};
  }

  .content-wrapper,
  .attribute-wrapper {
    ${mixins.flex({ direction: 'column', align: 'flex-start', justify: 'flex-start' })};
    gap: 8px;
  }

  .attribute-wrapper {
    flex-flow: wrap;
  }

  .trait-wrapper {
    ${mixins.flex({ direction: 'column', align: 'flex-start', justify: 'flex-start' })};
    width: auto;
    max-width: 100%;
    height: auto;
    padding: 5px 10px;
    gap: 4px;
    background-color: ${getTheme('neutral', '_9')};
    border-radius: 8px;

    .trait-type {
      color: ${getTheme('neutral', '_5')};
      ${fonts.body2Reg};
    }

    .trait-value {
      color: ${getTheme('neutral', '_1')};
      ${fonts.body2Reg};
    }
  }
`;
