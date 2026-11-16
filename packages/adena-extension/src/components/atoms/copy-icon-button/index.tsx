import IconCopy from '@assets/icon-copy';
import IconCopyCheck from '@assets/icon-copy-check';
import React, { useCallback, useEffect, useState } from 'react';
import { CopyButtonWrapper } from './copy-icon-button.styles';

export interface CopyIconButtonProps {
  className?: string;
  copyText: string;
  style?: React.CSSProperties;
  size?: number;
  onClick?: () => void;
}

export const CopyIconButton: React.FC<CopyIconButtonProps> = ({
  className = '',
  copyText,
  style = {},
  size = 16,
  onClick,
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

      !!onClick && onClick();
    },
    [copyText, checked, onClick],
  );

  return (
    <CopyButtonWrapper
      className={className}
      style={style}
      size={size}
      checked={checked}
      onClick={onClickCopyButton}
    >
      {checked ? <IconCopyCheck /> : <IconCopy />}
    </CopyButtonWrapper>
  );
};
