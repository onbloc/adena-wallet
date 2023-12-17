import React, { useCallback, useMemo, useState } from 'react';
import { AccountNameInputWrapper } from './account-name-input.styles';
import IconEdit from '@assets/icon-edit';

export interface AccountNameInputProps {
  originName: string;
  name: string;
  setName: (name: string) => void;
  reset: () => void;
}

const AccountNameInput: React.FC<AccountNameInputProps> = ({
  originName,
  name,
  setName,
  reset,
}) => {
  const [focused, setFocused] = useState(false);

  const extended = useMemo(() => {
    return focused;
  }, [focused]);

  const onFocus = useCallback(() => {
    setFocused(true);
  }, [setFocused]);

  const onFocusOut = useCallback(() => {
    setFocused(false);
  }, [setFocused]);

  const onChangeName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setName(event.target.value);
    },
    [setName],
  );

  const onClickReset = useCallback(() => {
    reset();
    setFocused(false);
  }, [reset]);

  return (
    <AccountNameInputWrapper className={`${extended && 'extended'}`}>
      <input
        className='name-input'
        value={name}
        onChange={onChangeName}
        type='text'
        autoComplete='off'
        placeholder={originName}
        onFocus={onFocus}
        onBlur={onFocusOut}
      />
      <div className='icon-wrapper' onClick={onClickReset}>
        <IconEdit />
      </div>
    </AccountNameInputWrapper>
  );
};

export default AccountNameInput;
