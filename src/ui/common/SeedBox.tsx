import theme from '@styles/theme';
import React from 'react';
import styled from 'styled-components';
import Typography from './Typography';

const Wrapper = styled.div`
  width: 100%;
  height: 140px;
  border: 1px solid ${({ theme }) => theme.color.neutral[3]};
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border-radius: 18px;
  padding: 8px;
`;

const Inner = styled.div`
  width: 100%;
  height: 100%;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 20px;
  padding: 10px 18px;
  .seed-text {
    ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')}
  }
`;

const SeedBox = ({ seeds }: { seeds: string[] }) => {
  return (
    <Wrapper>
      <Inner>
        {seeds?.map((seed: string) => (
          <Typography className='seed-text' key={seed} type='captionReg'>
            {seed}
          </Typography>
        ))}
      </Inner>
    </Wrapper>
  );
};

export default SeedBox;
