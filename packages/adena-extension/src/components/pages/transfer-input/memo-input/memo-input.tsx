import React, { useEffect, useMemo, useRef } from 'react';

import IconWarning from '@assets/warning-info.svg';
import { BaseError } from '@common/errors';
import { MemoInputWrapper } from './memo-input.styles';

export interface MemoInputProps {
  memo: string;
  memoError?: BaseError | null;
  onChangeMemo: (memo: string) => void;
}

const WARNING_TEXT = 'A memo is required when sending tokens to a centralized exchange.';

const MemoInput: React.FC<MemoInputProps> = ({ memo, memoError, onChangeMemo }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hasError = useMemo(() => {
    return !!memoError;
  }, [memoError]);

  const errorMessage = useMemo(() => {
    if (!memoError) {
      return '';
    }

    return memoError.message;
  }, [memoError]);

  const handleResizeHeight = (): void => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
  };

  const onChangeMemoTextArea = (memo: string): void => {
    onChangeMemo(memo);
    handleResizeHeight();
  };

  useEffect(() => {
    handleResizeHeight();
  }, []);

  return (
    <MemoInputWrapper>
      <textarea
        ref={inputRef}
        className={hasError ? 'memo-input error' : 'memo-input'}
        value={memo}
        onChange={(event): void => onChangeMemoTextArea(event.target.value)}
        rows={1}
        placeholder='Memo (Optional)'
      />

      {hasError && <span className='error-message'>{errorMessage}</span>}

      <div className='warning-wrapper'>
        <img className='icon-warning' src={IconWarning} alt='icon' />
        <span className='warning-text'>{WARNING_TEXT}</span>
      </div>
    </MemoInputWrapper>
  );
};

export default MemoInput;
