import {
  Icon,
} from '@components/atoms';
import React from 'react';

import {
  SpinnerWrapper,
} from './spinner.styles';

export interface SpinnerProps {
  size?: string | number
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 100,
}) => {
  return (
    <SpinnerWrapper size={size}>
      <Icon name='iconSpinnerLoading' className='icon-spinner' />
    </SpinnerWrapper>
  );
};
