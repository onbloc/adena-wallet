import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TestnetModeToggleWrapper = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  padding: 10px 16px;
  background-color: ${getTheme('neutral', '_7')};
  border-radius: 18px;
  margin-bottom: 16px;

  .label-wrapper {
    ${mixins.flex({ align: 'normal', justify: 'center' })};

    .label {
      color: ${getTheme('neutral', '_1')};
      font-size: 14px;
      font-weight: 600;
      line-height: 21px;
    }

    .description {
      color: ${getTheme('neutral', 'a')};
      font-size: 12px;
      font-weight: 400;
      line-height: 18px;
    }
  }

  .switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
    flex-shrink: 0;

    input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${getTheme('neutral', 'b')};
      transition: 0.2s;
      border-radius: 22px;

      &:before {
        position: absolute;
        content: '';
        height: 16px;
        width: 16px;
        left: 3px;
        bottom: 3px;
        background-color: ${getTheme('neutral', '_1')};
        transition: 0.2s;
        border-radius: 50%;
      }
    }

    input:checked + .slider {
      background-color: ${getTheme('primary', '_6')};
    }

    input:checked + .slider:before {
      transform: translateX(18px);
    }
  }
`;
