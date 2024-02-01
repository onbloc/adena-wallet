import React, { useCallback, useEffect, useState } from 'react';
import { CopyButtonWrapper } from './copy-icon-button.styles';
import IconCopy from '@assets/icon-copy';
import IconCopyCheck from '@assets/icon-copy-check';

export interface CopyIconButtonProps {
  className?: string;
  copyText: string;
  style?: React.CSSProperties;
}

export const CopyIconButton: React.FC<CopyIconButtonProps> = ({
  className = '',
  copyText,
  style = {},
}) => {
  const [checked, setChecked] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setChecked(false), 2000);
    return () => {
      clearTimeout(timer);
    };
  }, [checked]);

  const onClickCopyButton = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setChecked(true);
      navigator.clipboard.writeText(copyText);
    },
    [copyText, checked],
  );

  return (
    <CopyButtonWrapper className={className} style={style} checked={checked} onClick={onClickCopyButton}>
      {checked ? <IconCopyCheck /> : <IconCopy />}
    </CopyButtonWrapper>
  );
};
