import React from 'react';
import { useToast } from '@hooks/use-toast';
import Toast from '@components/atoms/toast/toast';

const ToastContainer: React.FC = () => {
  const { message, clear } = useToast();

  if (!message) {
    return <React.Fragment />;
  }

  return <Toast text={message} onFinish={clear} />;
};

export default ToastContainer;
