import React from 'react';
import { SpinnerWrapper } from './spinner.styles';
import Icon from '@components/icons';

export interface SpinnerProps {
  size?: string | number;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 100,
}) => {
  return (
    <SpinnerWrapper size={size}>
      <Icon name='iconSpinnerLoading' className='icon-spinner' />
    </SpinnerWrapper>
  );
};

export default Spinner;