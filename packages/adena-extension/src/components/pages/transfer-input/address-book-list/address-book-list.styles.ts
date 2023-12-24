import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const AddressBookListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  background-color: ${getTheme('neutral', '_9')};

  .no-address-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 13px 16px;
  }
`;

export const AddressBookListItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  min-height: 48px;
  padding: 13px 16px;
  justify-content: space-between;
  align-items: center;
  ${fonts.body2Reg};
  transition: 0.2s;
  cursor: pointer;

  :hover {
    background-color: ${getTheme('neutral', '_7')};
  }

  .name {
    font-weight: 600;
  }

  .address {
    color: ${getTheme('neutral', 'a')};
  }
`;
