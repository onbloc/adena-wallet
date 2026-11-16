import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const DocumentSignerListWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  gap: 12px;
  width: 100%;
  height: auto;
`;

export const DocumentSignerListItemWrapper = styled.div<{ borderColor: string }>`
  ${mixins.flex({ direction: 'row', justify: 'flex-start' })};
  padding: 10px 14px;
  width: 100%;
  height: auto;
  background: ${getTheme('neutral', '_9')};
  border: 1px solid ${({ borderColor }): string => borderColor};
  border-radius: 18px;
  transition: 0.2s;

  .logo-wrapper {
    position: relative;
    display: flex;
    flex-shrink: 0;
    width: 34px;
    height: 34px;

    .logo {
      ${mixins.flex({ direction: 'row', justify: 'center', align: 'center' })};
      ${fonts.body1Reg};
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: ${({ theme }): string => theme.neutral._5};
    }

    .badge {
      position: absolute;
      width: 12px;
      height: 12px;
      right: 0;
      bottom: 0;
    }
  }

  .title-wrapper {
    ${mixins.flex({ align: 'flex-start' })};
    width: 100%;
    margin: 0 12px;

    .title {
      ${mixins.flex({ direction: 'row', justify: 'center', align: 'center' })};
      ${fonts.body3Bold};
      /* display: inline-flex;
      align-items: center; */
      gap: 5px;
      line-height: 18px;

      &.extend {
        ${fonts.body2Bold};
      }

      .info {
        max-width: 110px;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }

      .link-button {
        display: flex;
        cursor: pointer;

        svg {
          path {
            fill: ${getTheme('neutral', 'a')};
            transition: 0.2s;
          }
        }

        &:hover {
          svg {
            path {
              fill: ${getTheme('neutral', '_1')};
            }
          }
        }
      }
    }

    .description {
      ${mixins.flex({ direction: 'row', justify: 'center', align: 'center' })};
      ${fonts.body3Reg};
      gap: 5px;
      color: ${getTheme('neutral', 'a')};
      line-height: 18px;
    }
  }

  .value-wrapper {
    ${mixins.flex({ align: 'flex-end' })};
    flex-wrap: wrap;
    width: fit-content;
    max-width: 150px;
    flex-shrink: 0;
    word-break: break-all;

    &.signed .value {
      color: ${getTheme('green', '_5')};
    }

    &.unsigned .value {
      color: ${getTheme('neutral', 'a')};
    }
  }
`;
