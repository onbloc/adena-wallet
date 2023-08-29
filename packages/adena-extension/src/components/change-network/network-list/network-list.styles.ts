import styled from 'styled-components';

export const NetworkListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;

  & > div {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;
