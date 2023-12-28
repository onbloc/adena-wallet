import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const AddressBookListWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
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
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  min-height: 48px;
  padding: 13px 16px;
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
