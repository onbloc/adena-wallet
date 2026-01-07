import React from 'react';
import { WebInputWithLabel } from '../web-input-with-label';

interface WebSignerInputItemProps {
  type: string;
  index: number;
  value: string;
  error: boolean;
  onChange: (value: string) => void;
}

export const WebSignerInputItem: React.FC<WebSignerInputItemProps> = ({
  index,
  value,
  error,
  onChange,
}) => {
  return (
    <WebInputWithLabel label={index.toString()} value={value} error={error} onChange={onChange} />
  );
};
