import styled from 'styled-components';

export const HistoryLayoutWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 24px 20px;
  margin-bottom: 60px;

  .title-wrapper {
    margin-bottom: 12px;

    .title {
      ${({ theme }) => theme.fonts.header4};
    }
  }
`;
