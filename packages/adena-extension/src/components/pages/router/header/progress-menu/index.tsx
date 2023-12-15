import React from 'react';
import styled, { CSSProp } from 'styled-components';
import { LeftArrowBtn } from '@components/buttons/arrow-buttons';
import { useNavigate } from 'react-router-dom';
import logo from '@assets/logo-withIcon.svg';

type ProgressLevel = 'first' | 'second' | 'third';

interface ProgressMenuProps {
  location?: string;
  showLogo?: boolean;
  progressLevel: ProgressLevel;
  hideArrow?: boolean;
}

const Wrapper = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')};
  width: 100%;
  height: 100%;
  border-bottom: 4px solid ${({ theme }): string => theme.color.neutral[6]};
  position: relative;
  padding: 0px 18px 0px 12px;
`;

const Button = styled(LeftArrowBtn)`
  position: absolute;
  left: 12px;
`;

const Hr = styled.hr<ProgressMenuProps>`
  border-color: ${({ theme }): string => theme.color.primary[3]};
  background-color: ${({ theme }): string => theme.color.primary[3]};
  width: ${({ progressLevel }): '30%' | '60%' | '100%' =>
    progressLevel === 'first' ? '30%' : progressLevel === 'second' ? '60%' : '100%'};
  height: 4px;
  position: absolute;
  left: 0;
  bottom: -4px;
  margin: 0px;
`;

export const ProgressMenu = ({
  progressLevel,
  showLogo = false,
  hideArrow = false,
}: ProgressMenuProps): JSX.Element => {
  const navigate = useNavigate();
  const handlePrevButtonClick = (): void => navigate(-1);

  return (
    <Wrapper>
      {(progressLevel === 'third' || showLogo) && <img src={logo} alt='adena logo' />}
      {!hideArrow && <Button onClick={handlePrevButtonClick} tabIndex={0} />}
      <Hr progressLevel={progressLevel} />
    </Wrapper>
  );
};
