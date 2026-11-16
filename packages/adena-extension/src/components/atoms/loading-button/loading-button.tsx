import React from 'react';
import { Button, ButtonProps } from '../button';
import { IconButtonLoading } from '../icon/icon-assets';

export interface LoadingButtonProps {
  loading: boolean;
}

const LoadingButton: React.FC<LoadingButtonProps & ButtonProps> = ({
  loading,
  children,
  ...props
}) => {
  return <Button {...props}>{loading ? <IconButtonLoading /> : children}</Button>;
};

export default LoadingButton;
