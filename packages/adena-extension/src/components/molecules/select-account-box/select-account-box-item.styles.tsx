import { Row } from '@components/atoms';
import styled from 'styled-components';

export const StyledSelectAccountBoxItem = styled(Row)`
  height: 48px;
  justify-content: space-between;
  padding: 0 20px;
  border-bottom: 1px solid #1f2329;
  :last-child {
    border-bottom: 1px solid #14161a;
  }
`;
