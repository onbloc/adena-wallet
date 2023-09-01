import styled from 'styled-components';

export const ApproveChangingNetworkItemWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 80px;
  height: auto;
  justify-content: center;
  align-items: center;

  img {
    display: flex;
    width: 80px;
    height: 80px;
    margin-bottom: 15px;
  }

  .chain-name {
    display: flex;
    width: 100px;
    padding: 5px 8px;
    background-color: ${({ theme }) => theme.color.neutral[8]};
    color: ${({ theme }) => theme.color.neutral[0]};
    ${({ theme }) => theme.fonts.body2Reg};
    font-weight: 500;
    border-radius: 8px;
    text-align: center;
    justify-content: center;
    word-break: break-word;
  }
`;
