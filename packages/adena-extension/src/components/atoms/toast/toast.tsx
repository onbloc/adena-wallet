import React, { useEffect, useState } from 'react';
import { ToastContent, ToastWrapper } from './toast.styles';

export interface ToastProps {
  text: string;
  onFinish: () => void;
}

const Toast: React.FC<ToastProps> = ({ text, onFinish }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, [text]);

  useEffect(() => {
    if (!visible) {
      const timeout = setTimeout(onFinish, 1000);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 3 * 1000);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [visible, text]);

  return (
    <ToastWrapper className={visible ? 'active' : ''}>
      <ToastContent>{text}</ToastContent>
    </ToastWrapper>
  );
};

export default Toast;
