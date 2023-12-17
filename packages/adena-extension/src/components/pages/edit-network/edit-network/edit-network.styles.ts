import styled from 'styled-components';

export const EditNetworkWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;

  & .content-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 24px 20px 72px 20px;
  }

  & .form-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 12px 0;
  }
`;
