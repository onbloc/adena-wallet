// Presentational styled-components and inline SVG icons for the session-add
// screen. Extracted from index.tsx to keep the screen logic readable.
import { ReactElement } from 'react';
import styled from 'styled-components';

import { Row, View } from '@components/atoms';

export const TabRow = styled(Row)`
  width: 350px;
  max-width: 100%;
  align-self: center;
  height: 44px;
  padding: 4px;
  column-gap: 4px;
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  overflow: visible;
  box-sizing: border-box;
`;

export const TabButton = styled.button<{ $active: boolean; disabled?: boolean }>`
  flex: 1;
  height: 36px;
  padding: 8px 12px;
  border-radius: 40px;
  border: none;
  background: ${({ $active }): string =>
    $active ? 'rgba(0, 89, 255, 0.24)' : 'transparent'};
  box-shadow: ${({ $active }): string =>
    $active ? '0 2px 8px 0 rgba(0, 0, 0, 0.16)' : 'none'};
  color: ${({ $active, disabled }): string => {
    if (disabled) return 'rgba(255, 255, 255, 0.35)';
    return $active ? '#FAFCFF' : '#878D99';
  }};
  cursor: ${({ disabled }): string => (disabled ? 'not-allowed' : 'pointer')};
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  line-height: 18px;
  letter-spacing: -0.28px;
  white-space: nowrap;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: ${({ $active, disabled }): string => {
      if (disabled) return 'transparent';
      return $active ? 'rgba(0, 89, 255, 0.24)' : 'rgba(255, 255, 255, 0.04)';
    }};
    color: ${({ disabled }): string =>
      disabled ? 'rgba(255, 255, 255, 0.35)' : '#FAFCFF'};
  }
`;

export const Card = styled(View)`
  width: 100%;
  row-gap: 16px;
`;

export const Field = styled(View)`
  row-gap: 6px;
`;

export const ConfigureCard = styled(View)`
  width: 100%;
  row-gap: 20px;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(188, 197, 214, 0.08);
  background: #14161A;
`;

export const ErrorBanner = styled(Row)`
  align-items: center;
  column-gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(220, 50, 50, 0.1);
  border: 1px solid rgba(220, 50, 50, 0.4);
`;

export const InlineErrorRow = styled(Row)`
  align-items: center;
  column-gap: 6px;
`;

export const SelectField = styled.div<{ $hasError?: boolean }>`
  position: relative;
  width: 100%;
  height: 40px;
  border-radius: 10px;
  border: 1px solid ${({ $hasError }): string => ($hasError ? '#5C2125' : '#1F2329')};
  background: ${({ $hasError }): string => ($hasError ? '#1A1112' : '#101214')};
  box-shadow: ${({ $hasError }): string =>
    $hasError
      ? '0px 1px 2px 0px rgba(0, 0, 0, 0.06), 0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 0px 0px 3px rgba(235, 84, 94, 0.12)'
      : 'none'};
  overflow: visible;
  display: flex;
  align-items: center;
`;

export const MasterLabelCell = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 135px;
  height: 40px;
  padding: 0 16px;
  background: #181b1f;
  border-right: 1px solid #1f2329;
  border-top-left-radius: 9px;
  border-bottom-left-radius: 9px;
  color: #878d99;
  font-size: 14px;
  flex-shrink: 0;
  white-space: nowrap;
`;

export const MasterLabelInfoIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: default;
`;

export const SelectTrigger = styled.button`
  width: 100%;
  height: 100%;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: none;
  outline: none;
  cursor: pointer;
  color: #fafcff;
  font-size: 14px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const SelectMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 352px;
  overflow-y: auto;
  z-index: 50;
  border-radius: 12px;
  border: 1px solid #1f2329;
  background: #101214;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
`;

export const SelectOption = styled.button<{ $active?: boolean; $align?: 'between' | 'start' }>`
  display: flex;
  width: 100%;
  height: 44px;
  align-items: center;
  justify-content: ${({ $align }): string =>
    $align === 'start' ? 'flex-start' : 'space-between'};
  padding: 0 16px;
  background: ${({ $active }): string => ($active ? '#181B1F' : '#101214')};
  border: none;
  border-bottom: 1px solid #1f2329;
  cursor: pointer;
  font-size: 14px;
  color: #fafcff;
  text-align: left;
  transition: background 0.15s ease;

  &:hover {
    background: #181B1F;
  }

  &:last-child {
    border-bottom: none;
  }
`;

export const SpendPeriodInputWrapper = styled.div<{ $hasError?: boolean }>`
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid ${({ $hasError }): string => ($hasError ? '#5C2125' : '#1F2329')};
  background: ${({ $hasError }): string => ($hasError ? '#1A1112' : '#101214')};
  box-shadow: ${({ $hasError }): string =>
    $hasError
      ? '0px 1px 2px 0px rgba(0, 0, 0, 0.06), 0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 0px 0px 3px rgba(235, 84, 94, 0.12)'
      : 'none'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  column-gap: 8px;
`;

export const SpendPeriodInput = styled.input`
  flex: 1;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: #fafcff;
  font-size: 14px;

  &::placeholder {
    color: #51555c;
  }
`;

export const AmountInputWrapper = styled.div`
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid #1f2329;
  background: #101214;
  display: flex;
  align-items: center;
  column-gap: 8px;
`;

export const AmountInput = styled.input`
  flex: 1;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: #fafcff;
  font-size: 14px;

  &::placeholder {
    color: #51555c;
  }
`;

export const UnitToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  cursor: pointer;
  color: #51555c;
  font-size: 14px;
  line-height: 20px;
  white-space: nowrap;
  transition: color 0.15s ease;

  span,
  svg {
    display: block;
    flex-shrink: 0;
  }

  &:hover {
    color: #fafcff;
  }
`;

export const RealmInputBox = styled.div<{ $hasError?: boolean }>`
  flex: 1;
  height: 40px;
  border-radius: 10px;
  border: 1px solid ${({ $hasError }): string => ($hasError ? '#5C2125' : '#1F2329')};
  background: ${({ $hasError }): string => ($hasError ? '#1A1112' : '#101214')};
  box-shadow: ${({ $hasError }): string =>
    $hasError
      ? '0px 1px 2px 0px rgba(0, 0, 0, 0.06), 0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 0px 0px 3px rgba(235, 84, 94, 0.12)'
      : 'none'};
  display: flex;
  align-items: center;
  padding: 0 12px;
`;

export const RealmInputInner = styled.input`
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: #fafcff;
  font-size: 14px;

  &::placeholder {
    color: #51555c;
  }
`;

export const IconButton = styled.button`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  border: 1px solid #1f2329;
  background: #101214;
  cursor: pointer;
  flex-shrink: 0;
  color: #878d99;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }
`;

export const TooltipWrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: default;
`;

export const TooltipBox = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  max-width: 230px;
  width: max-content;
  padding: 10px;
  border-radius: 8px;
  background: #191920;
  color: #ffffff;
  font-size: 12px;
  line-height: normal;
  z-index: 100;
  pointer-events: none;
`;

export const TooltipBoxAbove = styled(TooltipBox)`
  top: auto;
  right: auto;
  left: 50%;
  bottom: calc(100% + 6px);
  transform: translateX(-50%);
`;

export const DisableTransferToggleWrapper = styled.div`
  & > div {
    width: 34px;
    height: 20px;
    padding: 2px;
  }
  & > div .circle {
    width: 16px;
    height: 16px;
  }
  & > div.activated .circle {
    margin-left: 14px;
  }
`;

export const KeyActionRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
`;

export const DropdownChevronIcon = (): ReactElement => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='none'
    aria-hidden='true'
    focusable='false'
  >
    <path
      d='M4 6L8 10L12 6'
      stroke='#777777'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export const ChangeUnitIcon = (): ReactElement => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='12'
    height='12'
    viewBox='0 0 11 11'
    fill='none'
    aria-hidden='true'
    focusable='false'
  >
    <path
      d='M5.04232 3.66146L8.33086 3.66146L7.15065 2.48125L7.79232 1.82813L10.084 4.11979L7.79232 6.41146L7.15065 5.75833L8.33086 4.57813L5.04232 4.57813L5.04232 3.66146ZM0.917318 6.86979L3.20898 4.57813L3.85065 5.23125L2.67044 6.41146L5.95898 6.41146L5.95898 7.32813L2.67044 7.32813L3.85065 8.50833L3.20898 9.16146L0.917318 6.86979Z'
      fill='currentColor'
    />
  </svg>
);

export const PlusIcon = (): ReactElement => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    aria-hidden='true'
    focusable='false'
  >
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z'
      fill='#FAFCFF'
    />
  </svg>
);

export const MinusIcon = (): ReactElement => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    aria-hidden='true'
    focusable='false'
  >
    <path d='M19 13H5V11H19V13Z' fill='#FAFCFF' />
  </svg>
);

export const Spinner = styled.span`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.32);
  border-top-color: #ffffff;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const SessionRows = styled(View)`
  width: 100%;
  row-gap: 12px;
`;

export const ImportErrorList = styled(View)`
  width: 100%;
  row-gap: 10px;
`;

export const ImportErrorRow = styled(Row)`
  align-items: center;
  column-gap: 8px;
`;

export const MasterInputRow = styled(Row)<{ $hasError?: boolean }>`
  width: 100%;
  height: 40px;
  border-radius: 10px;
  border: 1px solid ${({ $hasError }): string => ($hasError ? '#5C2125' : '#1F2329')};
  background: ${({ $hasError }): string => ($hasError ? '#1A1112' : '#101214')};
  box-shadow: ${({ $hasError }): string =>
    $hasError
      ? '0px 1px 2px 0px rgba(0, 0, 0, 0.06), 0px 1px 3px 0px rgba(0, 0, 0, 0.1), 0px 0px 0px 3px rgba(235, 84, 94, 0.12)'
      : 'none'};
  overflow: hidden;
`;

export const MasterLabelArea = styled(Row)<{ $hasError?: boolean }>`
  position: relative;
  width: 135px;
  height: 100%;
  padding: 0 16px;
  background: ${({ $hasError }): string => ($hasError ? '#271518' : '#181b1f')};
  border-right: 1px solid ${({ $hasError }): string => ($hasError ? '#5C2125' : '#1f2329')};
  align-items: center;
  justify-content: center;
  column-gap: 4px;
  white-space: nowrap;
  color: ${({ $hasError }): string => ($hasError ? '#EB545E' : '#878d99')};
  font-size: 14px;
  flex-shrink: 0;
`;

export const MasterInfoIcon = styled.div`
  display: flex;
  align-items: center;
  cursor: default;
`;

export const MasterInputField = styled.input`
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border: none;
  outline: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.95);
  font-size: 14px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
`;

export const MasterAddressWrapper = styled(View)`
  position: relative;
  width: 100%;
`;

export const MasterTooltipBox = styled.div<{ $placement?: 'top' | 'bottom' }>`
  position: absolute;
  ${({ $placement = 'bottom' }): string =>
    $placement === 'top' ? 'bottom: calc(100% + 6px);' : 'top: calc(100% + 6px);'}
  left: 0;
  max-width: 230px;
  width: max-content;
  padding: 10px;
  border-radius: 8px;
  background: #191920;
  color: #ffffff;
  font-size: 12px;
  line-height: normal;
  z-index: 100;
  pointer-events: none;
`;

export const SessionCard = styled(View)<{ $hasError?: boolean }>`
  width: 100%;
  border-radius: 10px;
  border: 1px solid
    ${({ $hasError }): string =>
      $hasError ? 'rgba(220, 50, 50, 0.5)' : 'rgba(255, 255, 255, 0.08)'};
  background: #14161A;
  overflow: hidden;
`;

export const SessionCardHeader = styled(Row)<{ $disabled?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  align-items: center;
  justify-content: space-between;
  background: #14161a;
  cursor: ${({ $disabled }): string => ($disabled ? 'default' : 'pointer')};
  user-select: none;
`;

export const SessionCardBody = styled(View)`
  padding: 0 16px 14px;
`;

export const ImportSessionAddress = styled.span`
  min-width: 0;
  overflow: hidden;
  color: #6C717A;
  text-align: center;
  leading-trim: both;
  text-edge: cap;
  text-overflow: ellipsis;
  font-family: Inter, sans-serif;
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: 22px;
  letter-spacing: 0;
  white-space: nowrap;
`;
