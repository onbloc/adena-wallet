import React from 'react';
import { Button, ButtonProps } from '../button';

export interface LoadingButtonProps {
  loading: boolean;
}

const LoadingButton: React.FC<LoadingButtonProps & ButtonProps> = ({
  loading,
  children,
  ...props
}) => {
  return <Button {...props}>{loading ? 'Loading..' : children}</Button>;
};

export default LoadingButton;
