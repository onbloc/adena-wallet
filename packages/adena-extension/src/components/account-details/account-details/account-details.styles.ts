import styled from 'styled-components';

export const AccountDetailsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 24px 20px;

  .name-input-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    justify-content: center;
    align-items: center;
  }

  .qrcode-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 12px 0;
    justify-content: center;
    align-items: center;

    .qrcode-background {
      display: flex;
      background-color: #fff;
      padding: 10px;
      border-radius: 8px;
    }

    .qrcode-address-wrapper {
      display: flex;
      flex-direction: row;
      width: 100%;
      height: 42px;
      background-color: ${({ theme }) => theme.color.neutral[8]};
      margin-top: 12px;
      padding: 12px 18px 12px 16px;
      border-radius: 18px;
      justify-content: space-between;
      align-items: center;

      .address {
        display: block;
        width: 100%;
        margin-right: 8px;
        ${({ theme }) => theme.fonts.light1Reg}
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
`;
