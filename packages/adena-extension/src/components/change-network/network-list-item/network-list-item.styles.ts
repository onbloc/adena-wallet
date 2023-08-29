import styled from 'styled-components';

export const NetworkListItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: auto;
  padding: 9px 16px;
  background-color: ${({ theme }) => theme.color.neutral[6]};
  border-radius: 18px;
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.neutral[11]};
  }

  .info-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    font-size: 12px;
    font-weight: 600;
    line-height: 21px;

    .name-wrapper {
      display: flex;
      flex-direction: row;
      align-items: center;

      .name {
        display: block;
        max-width: 100%;
        color: ${({ theme }) => theme.color.neutral[0]};

        overflow: hidden;
        text-overflow: ellipsis;
      }

      .icon-wrapper {
        display: flex;
        margin: 0 5px;

        & svg {
          width: 12px;
          height: 12px;
        }

        & .icon-edit {
          width: 10px;
          height: 10px;

          path {
            transition: 0.2s;
            fill: ${({ theme }) => theme.color.neutral[9]};
          }

          &:hover {
            path {
              fill: ${({ theme }) => theme.color.neutral[0]};
            }
          }
        }
      }
    }

    .description-wrapper {
      display: flex;
      flex-direction: row;
      align-items: center;

      .description {
        display: block;
        max-width: 100%;
        color: ${({ theme }) => theme.color.neutral[9]};
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }

  .selected-wrapper {
    display: flex;
    flex-shrink: 0;
    width: 24px;
    padding: 4px;
    justify-content: center;
    align-items: center;

    .icon-check {
      width: 16px;
      height: 16px;
    }
  }
`;
