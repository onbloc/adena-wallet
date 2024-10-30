import React, { useCallback, useState } from 'react';
import { OptionDropdownItemWrapper, OptionDropdownWrapper } from './option-dropdown.styles';

interface OptionItem {
  icon?: React.ReactNode;
  text: string;
  onClick: () => void;
}

export interface OptionDropdownProps {
  buttonNode: React.ReactNode;
  options: OptionItem[];
  hover?: boolean;
}

const OptionDropdown: React.FC<OptionDropdownProps> = ({ buttonNode, options, hover }) => {
  const [opened, setOpened] = useState(false);

  const onMouseOverDropdown = useCallback(() => {
    if (!hover) {
      return;
    }

    setOpened(true);
  }, [hover]);

  const onMouseOutDropdown = useCallback(() => {
    setOpened(false);
  }, [hover]);

  const onClickDropdown = useCallback(() => {
    if (hover) {
      return;
    }
    setOpened(true);
  }, [hover]);

  const onClickOptionItem = useCallback((option: OptionDropdownItemProps) => {
    option.onClick();
    setOpened(false);
  }, []);

  return (
    <OptionDropdownWrapper
      className={opened ? 'opened' : ''}
      position='left'
      onMouseOver={onMouseOverDropdown}
      onMouseOut={onMouseOutDropdown}
      onClick={onClickDropdown}
    >
      <div className='button-wrapper'>{buttonNode}</div>

      {opened && (
        <div className={opened ? 'dropdown-static-wrapper active' : 'dropdown-static-wrapper'}>
          {options.map((option, index) => (
            <OptionDropdownItem
              key={index}
              text={option.text}
              icon={option.icon}
              onClick={(): void => onClickOptionItem(option)}
            />
          ))}
        </div>
      )}
    </OptionDropdownWrapper>
  );
};

/**
 * Option Dropdown Item Component
 */
interface OptionDropdownItemProps {
  icon?: React.ReactNode;
  text: string;
  onClick: () => void;
}

const OptionDropdownItem: React.FC<OptionDropdownItemProps> = ({ icon, text, onClick }) => {
  return (
    <OptionDropdownItemWrapper onClick={onClick}>
      {!!icon && icon}
      <span className='title'>{text}</span>
    </OptionDropdownItemWrapper>
  );
};

export default OptionDropdown;
