import React, { useEffect, useMemo, useState } from 'react';

import { ArgumentEditBoxWrapper } from './argument-edit-box.styles';

import IconEditCancel from '@assets/icon-edit-cancel';
import IconEditConfirm from '@assets/icon-edit-confirm';
import IconPencil from '@assets/icon-pencil';
import { reverseString } from '@common/utils/string-utils';

export interface ArgumentEditBoxProps {
  editRightMargin?: number;
  value: string;
  onChange: (value: string) => void;
  editable?: boolean;
}

type EditStateType = 'confirm' | 'cancel' | 'blur' | 'none';

const ArgumentEditBox: React.FC<ArgumentEditBoxProps> = ({
  value,
  onChange,
  editRightMargin = -18,
  editable = true,
}) => {
  const [editableValue, setEditableValue] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [editState, setEditState] = useState<EditStateType>('none');

  const displayValue = useMemo(() => {
    if (!value) {
      return '';
    }

    return reverseString(value);
  }, [value]);

  const activateEditMode = (): void => {
    setEditableValue(true);
  };

  const deactivateEditMode = (): void => {
    setEditableValue(false);
  };

  const saveEdit = (): void => {
    if (!editableValue) {
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
    if (!editableValue) {
      return;
    }

    setEditValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (!editableValue) {
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
    setEditableValue(false);
  }, [editState]);

  const marginRight = useMemo(() => {
    if (editableValue) {
      return editRightMargin;
    }

    return 0;
  }, [editableValue, editRightMargin]);

  return (
    <ArgumentEditBoxWrapper marginRight={marginRight}>
      {editableValue ? (
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
          {editable && (
            <div className='icon-wrapper' onClick={activateEditMode}>
              <IconPencil className='edit-icon' />
            </div>
          )}
        </div>
      )}
    </ArgumentEditBoxWrapper>
  );
};

export default ArgumentEditBox;
