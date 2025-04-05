import React, { useEffect, useMemo, useState } from 'react';

import { ArgumentEditBoxWrapper } from './argument-edit-box.styles';

import IconEditCancel from '@assets/icon-edit-cancel';
import IconEditConfirm from '@assets/icon-edit-confirm';
import IconPencil from '@assets/icon-pencil';

export interface ArgumentEditBoxProps {
  editRightMargin?: number;
  value: string;
  onChange: (value: string) => void;
}

type EditStateType = 'confirm' | 'cancel' | 'blur' | 'none';

const ArgumentEditBox: React.FC<ArgumentEditBoxProps> = ({
  value,
  onChange,
  editRightMargin = -18,
}) => {
  const [editable, setEditable] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [editState, setEditState] = useState<EditStateType>('none');

  const displayValue = useMemo(() => {
    if (!value) {
      return '';
    }

    return value.split('').reverse().join('');
  }, [value]);

  const activateEditMode = (): void => {
    setEditable(true);
  };

  const deactivateEditMode = (): void => {
    setEditable(false);
  };

  const saveEdit = (): void => {
    if (!editable) {
      return;
    }

    deactivateEditMode();
    onChange(editValue);
  };

  const cancelEdit = (): void => {
    deactivateEditMode();
    setEditValue(value);
  };

  const changeEditValue = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (!editable) {
      return;
    }

    setEditValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!editable) {
      return;
    }

    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const onClickEditConfirm = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setEditState('confirm');
  };

  const onClickEditCancel = (e: React.MouseEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setEditState('cancel');
  };

  const onBlurEdit = (): void => {
    setEditState('blur');
  };

  useEffect(() => {
    switch (editState) {
      case 'none':
        return;
      case 'cancel':
        cancelEdit();
        break;
      case 'blur':
      case 'confirm':
        saveEdit();
        break;
    }

    setEditState('none');
    setEditable(false);
  }, [editState]);

  const marginRight = useMemo(() => {
    if (editable) {
      return editRightMargin;
    }

    return 0;
  }, [editable, editRightMargin]);

  return (
    <ArgumentEditBoxWrapper marginRight={marginRight}>
      {editable ? (
        <div className='editable-wrapper'>
          <input
            className='edit-input'
            value={editValue}
            onChange={changeEditValue}
            onKeyDown={handleKeyDown}
            onBlur={onBlurEdit}
          />
          <div className='button-wrapper'>
            <div className='icon-wrapper' onMouseDown={onClickEditConfirm}>
              <IconEditConfirm className='edit-confirm-icon' />
            </div>
            <div className='icon-wrapper' onMouseDown={onClickEditCancel}>
              <IconEditCancel className='edit-cancel-icon' />
            </div>
          </div>
        </div>
      ) : (
        <div className='display-wrapper'>
          <span className='display-value'>{displayValue}</span>
          <div className='icon-wrapper' onClick={activateEditMode}>
            <IconPencil className='edit-icon' />
          </div>
        </div>
      )}
    </ArgumentEditBoxWrapper>
  );
};

export default ArgumentEditBox;
