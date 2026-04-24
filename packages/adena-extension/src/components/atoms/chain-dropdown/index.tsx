import React, { useMemo, useState } from 'react';
import styled from 'styled-components';

import { CHAIN_ICON_BY_GROUP } from '@assets/icons/cosmos-icons';
import IconChevronDown from '@assets/icon-chevron-down';
import { useAdenaContext } from '@hooks/use-context';
import { fonts, getTheme } from '@styles/theme';
import mixins from '@styles/mixins';

const CHAIN_DISPLAY_NAME: Record<string, string> = {
  gno: 'Gno.land',
  atomone: 'AtomOne',
};

interface ChainOption {
  chainGroup: string;
  name: string;
  icon?: string;
}

interface ChainDropdownProps {
  value: string;
  onChange: (chainGroup: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

const Trigger = styled.button<{ disabled?: boolean }>`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
  height: 48px;
  padding: 14px 16px;
  border: 1px solid ${getTheme('neutral', '_7')};
  border-radius: 30px;
  background-color: ${getTheme('neutral', '_9')};
  cursor: ${({ disabled }): string => (disabled ? 'default' : 'pointer')};
  opacity: ${({ disabled }): number => (disabled ? 0.6 : 1)};

  .label {
    ${fonts.body2Reg};
    color: ${getTheme('neutral', 'a')};
  }

  .value {
    ${mixins.flex({ direction: 'row', align: 'center' })};
    gap: 6px;
  }

  .value .name {
    ${fonts.body2Reg};
    color: ${getTheme('neutral', '_1')};
  }

  .value .chain-icon {
    width: 16px;
    height: 16px;
    border-radius: 50%;
  }

  .value .chevron {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    color: ${getTheme('neutral', '_1')};
  }
`;

const Menu = styled.ul`
  ${mixins.flex({ align: 'stretch', justify: 'flex-start' })};
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  margin: 0;
  padding: 6px 0;
  background-color: ${getTheme('neutral', '_9')};
  border: 1px solid ${getTheme('neutral', '_7')};
  border-radius: 16px;
  list-style: none;
`;

const MenuItem = styled.li`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-start' })};
  gap: 8px;
  width: 100%;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${getTheme('neutral', '_7')};
  }

  .chain-icon {
    width: 18px;
    height: 18px;
    border-radius: 50%;
  }

  .name {
    ${fonts.body2Reg};
    color: ${getTheme('neutral', '_1')};
  }
`;

export const ChainDropdown: React.FC<ChainDropdownProps> = ({
  value,
  onChange,
  disabled,
  placeholder = 'Chain',
}) => {
  const { chainRegistry } = useAdenaContext();
  const [opened, setOpened] = useState(false);

  const options: ChainOption[] = useMemo(() => {
    const seen = new Set<string>();
    return chainRegistry
      .list()
      .filter((profile) => {
        if (seen.has(profile.chainGroup)) return false;
        seen.add(profile.chainGroup);
        return true;
      })
      .map((profile) => ({
        chainGroup: profile.chainGroup,
        name: CHAIN_DISPLAY_NAME[profile.chainGroup] ?? profile.displayName,
        icon: CHAIN_ICON_BY_GROUP[profile.chainGroup] ?? profile.chainIconUrl,
      }));
  }, [chainRegistry]);

  const selected = useMemo(
    () => options.find((o) => o.chainGroup === value),
    [options, value],
  );

  const otherOptions = useMemo(
    () => options.filter((o) => o.chainGroup !== value),
    [options, value],
  );

  const toggle = (): void => {
    if (disabled) return;
    setOpened((prev) => !prev);
  };

  const onSelect = (chainGroup: string): void => {
    onChange(chainGroup);
    setOpened(false);
  };

  return (
    <Wrapper>
      <Trigger type='button' disabled={disabled} onClick={toggle}>
        <span className='label'>{placeholder}</span>
        {selected && (
          <span className='value'>
            {selected.icon && (
              <img className='chain-icon' src={selected.icon} alt={selected.name} />
            )}
            <span className='name'>{selected.name}</span>
            <span className='chevron'>
              <IconChevronDown />
            </span>
          </span>
        )}
      </Trigger>

      {opened && otherOptions.length > 0 && (
        <Menu>
          {otherOptions.map((option) => (
            <MenuItem
              key={option.chainGroup}
              onClick={(): void => onSelect(option.chainGroup)}
            >
              {option.icon && (
                <img className='chain-icon' src={option.icon} alt={option.name} />
              )}
              <span className='name'>{option.name}</span>
            </MenuItem>
          ))}
        </Menu>
      )}
    </Wrapper>
  );
};

export default ChainDropdown;
