import BigNumber from 'bignumber.js';
import React, { useCallback, useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import { DefaultInput, Text } from '@components/atoms';
import Toggle from '@components/atoms/toggle';
import { BottomFixedButton } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
import {
  AGENT_HOST_ENABLED_STORAGE_KEY,
  AGENT_HOST_RELOAD_REQUIRED,
  AGENT_HOST_STATUS_STORAGE_KEY,
  AgentHostStatus,
} from '@inject/agent-host/agent-host-protocol';
import {
  getMaxSpendLimitUgnot,
  isMasterRequestsAllowed,
  isValidMaxSpendLimit,
  setMasterRequestsAllowed as saveMasterRequestsAllowed,
  setMaxSpendLimitUgnot,
} from '@inject/agent-host/agent-host-settings';
import mixins from '@styles/mixins';
import { fonts } from '@styles/theme';

const NATIVE_MESSAGING_PERMISSION: chrome.permissions.Permissions = {
  permissions: ['nativeMessaging'],
};

const readEnabled = async (): Promise<boolean> => {
  const stored = await chrome.storage.local.get(AGENT_HOST_ENABLED_STORAGE_KEY);
  if (stored?.[AGENT_HOST_ENABLED_STORAGE_KEY] !== true) {
    return false;
  }
  return chrome.permissions.contains(NATIVE_MESSAGING_PERMISSION).catch(() => false);
};

const UGNOT_DECIMALS = 6;

const ugnotToGnot = (ugnot: string): string =>
  new BigNumber(ugnot).shiftedBy(-UGNOT_DECIMALS).toFixed();

// Returns null unless the input is a positive GNOT amount with at most 6 decimals.
const gnotToUgnot = (gnot: string): string | null => {
  const amount = new BigNumber(gnot.trim());
  if (!amount.isFinite() || !amount.isPositive()) {
    return null;
  }
  const ugnot = amount.shiftedBy(UGNOT_DECIMALS);
  if (!ugnot.isInteger()) {
    return null;
  }
  const value = ugnot.toFixed();
  return isValidMaxSpendLimit(value) ? value : null;
};

const readStatus = async (): Promise<AgentHostStatus | null> => {
  const stored = await chrome.storage.session.get(AGENT_HOST_STATUS_STORAGE_KEY);
  return (stored?.[AGENT_HOST_STATUS_STORAGE_KEY] as AgentHostStatus | undefined) ?? null;
};

export const AgentConnection = (): JSX.Element => {
  const theme = useTheme();
  const { goBack } = useAppNavigate();
  const [enabled, setEnabled] = useState(false);
  const [masterRequestsAllowed, setMasterRequestsAllowed] = useState(false);
  const [status, setStatus] = useState<AgentHostStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedMaxSpendGnot, setSavedMaxSpendGnot] = useState('');
  const [maxSpendGnot, setMaxSpendGnot] = useState('');
  const [maxSpendError, setMaxSpendError] = useState<string | null>(null);

  useEffect(() => {
    readEnabled().then(setEnabled);
    isMasterRequestsAllowed().then(setMasterRequestsAllowed);
    getMaxSpendLimitUgnot().then((ugnot) => {
      const gnot = ugnotToGnot(ugnot);
      setSavedMaxSpendGnot(gnot);
      setMaxSpendGnot(gnot);
    });
    readStatus().then(setStatus);

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ): void => {
      if (areaName === 'session' && AGENT_HOST_STATUS_STORAGE_KEY in changes) {
        setStatus((changes[AGENT_HOST_STATUS_STORAGE_KEY].newValue as AgentHostStatus) ?? null);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const onToggle = useCallback(async (activated: boolean) => {
    setErrorMessage(null);
    if (activated) {
      // The permission prompt must run from this user gesture.
      const granted = await chrome.permissions
        .request(NATIVE_MESSAGING_PERMISSION)
        .catch(() => false);
      if (!granted) {
        setErrorMessage('Permission to communicate with the agent host was not granted.');
        return;
      }
    }
    await chrome.storage.local.set({ [AGENT_HOST_ENABLED_STORAGE_KEY]: activated });
    setEnabled(activated);
  }, []);

  const onToggleMasterRequests = useCallback(async (activated: boolean) => {
    await saveMasterRequestsAllowed(activated);
    setMasterRequestsAllowed(activated);
  }, []);

  const onSaveMaxSpend = useCallback(async () => {
    const ugnot = gnotToUgnot(maxSpendGnot);
    if (!ugnot) {
      setMaxSpendError('Enter a positive GNOT amount with up to 6 decimal places.');
      return;
    }
    await setMaxSpendLimitUgnot(ugnot);
    const gnot = ugnotToGnot(ugnot);
    setSavedMaxSpendGnot(gnot);
    setMaxSpendGnot(gnot);
    setMaxSpendError(null);
  }, [maxSpendGnot]);

  const reloadRequired = enabled && status?.error === AGENT_HOST_RELOAD_REQUIRED;

  const statusText = !enabled
    ? 'Disabled'
    : status?.connected
      ? 'Connected'
      : reloadRequired
        ? 'Reload Adena to finish turning on the agent connection.'
        : status?.error
          ? `Not connected: ${status.error}`
          : 'Not connected';

  return (
    <Wrapper>
      <Text type='header4'>AI Agent Connection</Text>
      <Description type='body2Reg' color={theme.neutral.a}>
        Allow AI agents on this computer to request session accounts through the Adena agent host.
        Every session request and revocation still needs your approval.
      </Description>
      <ToggleRow>
        <Text type='body2Bold'>Enable agent connection</Text>
        <Toggle activated={enabled} onToggle={onToggle} />
      </ToggleRow>
      <Text type='body3Reg' color={status?.connected ? theme.green._5 : theme.neutral.a}>
        {statusText}
      </Text>
      {reloadRequired && (
        <ActionButton type='button' onClick={(): void => chrome.runtime.reload()}>
          Reload Adena (you will need to unlock it again)
        </ActionButton>
      )}
      {enabled && (
        <>
          <ToggleRow>
            <Text type='body2Bold'>Allow master account requests</Text>
            <Toggle activated={masterRequestsAllowed} onToggle={onToggleMasterRequests} />
          </ToggleRow>
          <Text type='body3Reg' color={theme.neutral.a}>
            When on, agents may ask you to approve and sign transactions with your account directly,
            including package deployments. When off, agents can only act through session accounts
            you approve.
          </Text>
          <SettingTitle type='body2Bold'>Maximum session spend limit (GNOT)</SettingTitle>
          <InputRow>
            <DefaultInput
              value={maxSpendGnot}
              inputMode='decimal'
              error={maxSpendError !== null}
              onChange={(event): void => {
                setMaxSpendGnot(event.target.value);
                setMaxSpendError(null);
              }}
            />
            <ActionButton
              type='button'
              disabled={maxSpendGnot === savedMaxSpendGnot}
              onClick={onSaveMaxSpend}
            >
              Save
            </ActionButton>
          </InputRow>
          {maxSpendError && (
            <Text type='body3Reg' color={theme.red._5}>
              {maxSpendError}
            </Text>
          )}
          <Text type='body3Reg' color={theme.neutral.a}>
            Agents cannot ask for a session that spends more GNOT than this, gas fees included. It
            does not limit tokens or NFTs held by realms: a session allowed to call a realm can move
            them, so approve realm paths with care.
          </Text>
        </>
      )}
      {errorMessage && (
        <Text type='body3Reg' color={theme.red._5} margin='8px 0px 0px 0px'>
          {errorMessage}
        </Text>
      )}
      <BottomFixedButton onClick={goBack} />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  padding-bottom: 103px;
  overflow-y: auto;
`;

const Description = styled(Text)`
  margin-top: 12px;
`;

const ToggleRow = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
  margin: 24px 0px 8px 0px;
`;

const SettingTitle = styled(Text)`
  margin: 24px 0px 8px 0px;
`;

const InputRow = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
  gap: 8px;
  margin-bottom: 8px;
`;

const ActionButton = styled.button`
  flex-shrink: 0;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 18px;
  background-color: ${({ theme }): string => theme.primary._6};
  color: ${({ theme }): string => theme.neutral._1};
  ${fonts.body2Bold};
  cursor: pointer;
  ${InputRow} & {
    margin-top: 0px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
