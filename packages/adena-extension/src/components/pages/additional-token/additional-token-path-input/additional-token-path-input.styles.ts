import styled from 'styled-components';

import { View } from '@components/atoms';
import { fonts, getTheme } from '@styles/theme';

export const AdditionalTokenPathInputWrapper = styled(View)`
  width: 100%;

  .search-input {
    height: 48px;
    padding: 13px 16px;
    background-color: ${getTheme('neutral', '_9')};
    border: 1px solid ${getTheme('neutral', '_7')};
    color: ${getTheme('neutral', '_1')};
    border-radius: 30px;
    ${fonts.body2Reg};

    &.error {
      border-color: ${getTheme('red', '_5')};
    }
  }

  .error-message {
    padding: 0 8px;
    height: 18px;
  }
`;
