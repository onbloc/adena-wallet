import { styled } from 'styled-components';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import { fonts } from '@styles/theme';

export const MultisigThresholdContainer = styled.div`
  ${mixins.flex({ direction: 'column', justify: 'flex-start' })};
  width: 100%;
`;

export const MultisigThresholdWrapper = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  padding: 14px 16px;
  background-color: ${getTheme('neutral', '_9')};
  border: 1px solid ${getTheme('neutral', '_7')};
  border-radius: 30px;

  & .key {
    ${mixins.flex({ direction: 'row' })};
    flex-shrink: 0;
    color: ${getTheme('neutral', 'a')};
    ${fonts.body2Reg};
  }

  & .document-signers-amount-wrapper {
    ${mixins.flex({ direction: 'row', justify: 'flex-end' })};
    width: 100%;
    gap: 3px;

    & .setting-button {
      ${mixins.flex({ direction: 'row' })};
      width: 16px;
      height: 16px;
    }

    .value {
      ${fonts.body2Reg}
    }
  }
`;
