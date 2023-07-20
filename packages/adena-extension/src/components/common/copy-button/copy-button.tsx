import React, { useCallback, useEffect, useState } from 'react';
import { CopyButtonWrapper } from './copy-button.styles';
import IconCopy from '@assets/icon-copy';
import IconCopyCheck from '@assets/icon-copy-check';

export interface CopyButtonProps {
  className?: string;
  copyText: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({
  className = '',
  copyText
}) => {
  const [checked, setChecked] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setChecked(false), 2000);
    return () => {
      clearTimeout(timer);
    };
  }, [checked]);

  const onClickCopyButton = useCallback(() => {
    setChecked(true);
    navigator.clipboard.writeText(copyText);
  }, [copyText, checked])

  return (
    <CopyButtonWrapper className={className} checked={checked} onClick={onClickCopyButton}>
      {checked ? <IconCopyCheck /> : <IconCopy />}
    </CopyButtonWrapper>
  );
};

export default CopyButton;