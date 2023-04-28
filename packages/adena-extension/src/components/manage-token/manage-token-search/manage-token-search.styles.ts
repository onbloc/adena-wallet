import styled from 'styled-components';

export const ManageTokenSearchWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;

  .list-wrapper {
    display: flex;
    margin-top: 30px;
    max-height: 284px;
    overflow-y: auto;
    padding-bottom: 30px;
  }

  .close-wrapper {
    position: absolute;
    display: flex;
    left: 0;
    bottom: 0;
    width: 100vw;
    height: 96px;
    padding: 24px 20px;
    box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);

    .close {
      width: 100%;
      height: 100%;
      background-color: ${({ theme }) => theme.color.neutral[4]};
      border-radius: 30px;
      ${({ theme }) => theme.fonts.body1Bold};
      transition: 0.2s;

      :hover {
        background-color: ${({ theme }) => theme.color.neutral[5]};
      }
    }
  }
`;
