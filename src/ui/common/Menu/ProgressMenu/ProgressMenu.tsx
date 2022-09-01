import React from 'react';
import styled from 'styled-components';
import { LeftArrowBtn } from '@ui/common/Button/ArrowButtons';
import { useNavigate } from 'react-router-dom';
import logo from '../../../../assets/logo-withIcon.svg';

type ProgressLevel = 'first' | 'second' | 'third';

interface ProgressMenuProps {
  location?: string;
  progressLevel: ProgressLevel;
}

const Wrapper = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  width: 100%;
  height: 100%;
  border-bottom: 4px solid ${({ theme }) => theme.color.neutral[6]};
  position: relative;
  padding: 0px 18px 0px 12px;
`;

const Button = styled(LeftArrowBtn)`
  position: absolute;
  left: 12px;
`;

const Hr = styled.hr<ProgressMenuProps>`
  border-color: ${({ theme }) => theme.color.primary[3]};
  background-color: ${({ theme }) => theme.color.primary[3]};
  width: ${({ progressLevel }) =>
    progressLevel === 'first' ? '30%' : progressLevel === 'second' ? '60%' : '100%'};
  height: 4px;
  position: absolute;
  left: 0;
  bottom: -4px;
  margin: 0px;
`;

export const ProgressMenu = ({ location, progressLevel }: ProgressMenuProps) => {
  const navigate = useNavigate();
  const handlePrevButtonClick = () => navigate(-1);

  return (
    <Wrapper>
      {progressLevel === 'third' ? (
        <img src={logo} alt='adena logo' />
      ) : (
        <Button onClick={handlePrevButtonClick} tabIndex={0} />
      )}
      <Hr progressLevel={progressLevel} />
    </Wrapper>
  );
};
