import React, { useCallback, useEffect, useMemo, useState } from 'react';

import IconCancel from '@assets/cancel-small.svg';
import { WebErrorText, WebImg, WebInput, WebText } from '@components/atoms';
import { useTheme } from 'styled-components';

import {
  StyledAddressGroup,
  StyledCloseButton,
  StyledHDDerivationPathBox,
  StyledHeader,
  StyledPathRow,
  StyledSegmentInput,
} from './hd-derivation-path-box.styles';

export interface DerivationPathValue {
  account: number;
  change: number;
  addressIndex: number;
  address: string;
}

export interface HDDerivationPathBoxProps {
  // Derives the address for an exact path (account'/change/addressIndex).
  deriveAddress: (account: number, change: number, addressIndex: number) => Promise<string>;
  // Error message to surface under the address field (e.g. "Account already exists").
  error: string | null;
  // Reports the current path + derived address (null while no segment is entered).
  onChange: (value: DerivationPathValue | null) => void;
  onClose: () => void;
}

// Per-field valid ranges. account'/index are 31-bit non-negative integers;
// change is boolean (0 or 1). Purpose (44') and coin type (118') are fixed.
const ACCOUNT_MAX = 2 ** 31 - 1;
const CHANGE_MAX = 1;
const INDEX_MAX = 2 ** 31 - 1;

// Clamps raw input into the field's valid range: invalid or negative -> 0,
// above range -> max. Empty is kept empty (treated as 0 downstream).
function sanitizeSegment(raw: string, max: number): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return '';
  }
  if (trimmed.startsWith('-')) {
    return '0';
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits === '') {
    return '0';
  }
  const value = Number(digits);
  if (!Number.isFinite(value)) {
    return '0';
  }
  return value > max ? String(max) : String(value);
}

const toNumber = (value: string): number => (value === '' ? 0 : Number(value));

const HDDerivationPathBox: React.FC<HDDerivationPathBoxProps> = ({
  deriveAddress,
  error,
  onChange,
  onClose,
}) => {
  const theme = useTheme();
  const [accountValue, setAccountValue] = useState('');
  const [changeValue, setChangeValue] = useState('');
  const [addressIndexValue, setAddressIndexValue] = useState('');
  const [address, setAddress] = useState('');

  const hasInput = accountValue !== '' || changeValue !== '' || addressIndexValue !== '';
  const account = toNumber(accountValue);
  const change = toNumber(changeValue);
  const addressIndex = toNumber(addressIndexValue);

  // Derive the address for the entered path (debounced) and report it upward so
  // the parent can run the duplicate check and include it in the selection.
  useEffect(() => {
    if (!hasInput) {
      setAddress('');
      onChange(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const derived = await deriveAddress(account, change, addressIndex).catch(() => '');
      if (cancelled) {
        return;
      }
      setAddress(derived);
      onChange(derived ? { account, change, addressIndex, address: derived } : null);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasInput, account, change, addressIndex, deriveAddress, onChange]);

  const onChangeSegment = useCallback(
    (setter: (value: string) => void, max: number) =>
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        setter(sanitizeSegment(event.target.value, max));
      },
    [],
  );

  const hasError = Boolean(error);
  const addressValue = useMemo(() => (hasInput ? address : ''), [hasInput, address]);

  return (
    <StyledHDDerivationPathBox>
      <StyledHeader>
        <WebText type='title6'>HD Derivation Path</WebText>
        <StyledCloseButton type='button' onClick={onClose} aria-label='Close derivation path editor'>
          <WebImg src={IconCancel} size={16} />
        </StyledCloseButton>
      </StyledHeader>

      <StyledPathRow>
        <WebText type='body5' color={theme.webNeutral._700}>
          m/44&apos;/118&apos;/
        </WebText>
        <StyledSegmentInput
          value={accountValue}
          onChange={onChangeSegment(setAccountValue, ACCOUNT_MAX)}
          inputMode='numeric'
          aria-label='Account index (hardened)'
        />
        <WebText type='body5' color={theme.webNeutral._700}>
          &apos;/
        </WebText>
        <StyledSegmentInput
          value={changeValue}
          onChange={onChangeSegment(setChangeValue, CHANGE_MAX)}
          inputMode='numeric'
          aria-label='Change index'
        />
        <WebText type='body5' color={theme.webNeutral._700}>
          /
        </WebText>
        <StyledSegmentInput
          value={addressIndexValue}
          onChange={onChangeSegment(setAddressIndexValue, INDEX_MAX)}
          inputMode='numeric'
          aria-label='Address index'
        />
      </StyledPathRow>

      <WebText type='title6'>Address</WebText>
      <StyledAddressGroup>
        <WebInput width='100%' value={addressValue} error={hasError} readOnly />
        {hasError && error && <WebErrorText text={error} />}
      </StyledAddressGroup>
    </StyledHDDerivationPathBox>
  );
};

export default HDDerivationPathBox;
