import Toast from '@components/atoms/toast/toast';
import { useToast } from '@hooks/use-toast';
import React from 'react';

const ToastContainer: React.FC = () => {
  const { message, clear } = useToast();

  if (!message) {
    return <React.Fragment />;
  }

  return <Toast text={message} onFinish={clear} />;
};

export default ToastContainer;
