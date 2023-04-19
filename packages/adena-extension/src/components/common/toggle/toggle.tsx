import React from 'react';
import { ToggleWrapper } from './toggle.styles';

export interface ToggleProps {
  activated: boolean;
  onToggle: (activated: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ activated, onToggle }) => {
  return (
    <ToggleWrapper className={activated ? 'activated' : ''} onClick={() => onToggle(!activated)}>
      <div className='circle' />
    </ToggleWrapper>
  );
};

export default Toggle;