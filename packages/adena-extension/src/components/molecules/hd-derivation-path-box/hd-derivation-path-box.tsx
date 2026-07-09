import { formatHdPath } from 'adena-module';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import IconCancel from '@assets/cancel-small.svg';
import { View, WebImg, WebInput, WebText } from '@components/atoms';
import { useTheme } from 'styled-components';

import {
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
}

export interface HDDerivationPathBoxProps {
  // Derives the address for an exact path (account'/change/addressIndex) preview.
  deriveAddress: (account: number, change: number, addressIndex: number) => Promise<string>;
  // Reports the current path (null when any segment is invalid).
  onChange: (path: DerivationPathValue | null) => void;
  onClose: () => void;
}

// Only non-negative integers are valid path segments; empty is treated as 0.
function parseSegment(value: string): number | null {
  if (value.trim() === '') {
    return 0;
  }
  if (!/^\d+$/.test(value.trim())) {
    return null;
  }
  return Number(value.trim());
}

const HDDerivationPathBox: React.FC<HDDerivationPathBoxProps> = ({
  deriveAddress,
  onChange,
  onClose,
}) => {
  const theme = useTheme();
  const [accountValue, setAccountValue] = useState('0');
  const [changeValue, setChangeValue] = useState('0');
  const [addressIndexValue, setAddressIndexValue] = useState('0');
  const [address, setAddress] = useState('');

  const account = useMemo(() => parseSegment(accountValue), [accountValue]);
  const change = useMemo(() => parseSegment(changeValue), [changeValue]);
  const addressIndex = useMemo(() => parseSegment(addressIndexValue), [addressIndexValue]);

  const isValid = account !== null && change !== null && addressIndex !== null;

  // Report the current path (or null) up to the parent so "Next" knows whether
  // it can add the single account and at which path.
  useEffect(() => {
    if (account === null || change === null || addressIndex === null) {
      onChange(null);
      return;
    }
    onChange({ account, change, addressIndex });
  }, [account, change, addressIndex, onChange]);

  // Preview the derived address for the exact path (debounced).
  useEffect(() => {
    if (account === null || change === null || addressIndex === null) {
      setAddress('');
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const derived = await deriveAddress(account, change, addressIndex).catch(() => '');
      if (!cancelled) {
        setAddress(derived);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [account, change, addressIndex, deriveAddress]);

  const previewPath = useMemo(
    () =>
      formatHdPath({
        account: account ?? 0,
        change: change ?? 0,
        addressIndex: addressIndex ?? 0,
      }),
    [account, change, addressIndex],
  );

  const onChangeSegment = useCallback(
    (setter: (value: string) => void) =>
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        setter(event.target.value);
      },
    [],
  );

  return (
    <StyledHDDerivationPathBox>
      <StyledHeader>
        <WebText type='title6'>HD Derivation Path</WebText>
        <StyledCloseButton type='button' onClick={onClose} aria-label='Close derivation path editor'>
          <WebImg src={IconCancel} size={16} />
        </StyledCloseButton>
      </StyledHeader>

      <StyledPathRow>
        <WebText type='body5' color={theme.webNeutral._500}>
          m/44&apos;/118&apos;/
        </WebText>
        <StyledSegmentInput
          value={accountValue}
          onChange={onChangeSegment(setAccountValue)}
          error={account === null}
          inputMode='numeric'
          aria-label='Account index (hardened)'
        />
        <WebText type='body5' color={theme.webNeutral._500}>
          &apos;/
        </WebText>
        <StyledSegmentInput
          value={changeValue}
          onChange={onChangeSegment(setChangeValue)}
          error={change === null}
          inputMode='numeric'
          aria-label='Change index'
        />
        <WebText type='body5' color={theme.webNeutral._500}>
          /
        </WebText>
        <StyledSegmentInput
          value={addressIndexValue}
          onChange={onChangeSegment(setAddressIndexValue)}
          error={addressIndex === null}
          inputMode='numeric'
          aria-label='Address index'
        />
      </StyledPathRow>

      <WebText type='title6'>Address</WebText>
      <View>
        <WebInput width='100%' value={isValid ? address : ''} placeholder={previewPath} readOnly />
      </View>
    </StyledHDDerivationPathBox>
  );
};

export default HDDerivationPathBox;
