import React from 'react';
import styled from 'styled-components';

import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

export interface DatatableProps {
  data: {
    key: string;
    value: string;
  }[];
}

const StyledContainer = styled.div`
  ${mixins.flex({ direction: 'column', justify: 'flex-start' })};
  width: 100%;
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 18px;

  .row {
    ${mixins.flex({ direction: 'row', justify: 'space-between' })};
    width: 100%;
    padding: 10px 18px;
    border-bottom: 1px solid ${getTheme('neutral', '_8')};

    &:last-child {
      border-bottom: none;
    }

    .column {
      ${fonts.body2Reg};
      color: ${getTheme('neutral', '_1')};

      &.key {
        color: ${getTheme('neutral', 'a')};
      }
    }
  }
`;

export const Datatable: React.FC<DatatableProps> = ({ data }) => {
  return (
    <StyledContainer>
      {data.map((item, index) => (
        <div key={index} className='row'>
          <span className='column key'>{item.key}</span>
          <span className='column'>{item.value}</span>
        </div>
      ))}
    </StyledContainer>
  );
};
