import React, { useCallback, useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';

import { Text } from '@components/atoms';
import Toggle from '@components/atoms/toggle';
import { BottomFixedButton } from '@components/molecules';
import useAppNavigate from '@hooks/use-app-navigate';
import {
  AGENT_HOST_ENABLED_STORAGE_KEY,
  AGENT_HOST_STATUS_STORAGE_KEY,
  AgentHostStatus,
} from '@inject/agent-host/agent-host-protocol';
import mixins from '@styles/mixins';

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

const readStatus = async (): Promise<AgentHostStatus | null> => {
  const stored = await chrome.storage.session.get(AGENT_HOST_STATUS_STORAGE_KEY);
  return (stored?.[AGENT_HOST_STATUS_STORAGE_KEY] as AgentHostStatus | undefined) ?? null;
};

export const AgentConnection = (): JSX.Element => {
  const theme = useTheme();
  const { goBack } = useAppNavigate();
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<AgentHostStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    readEnabled().then(setEnabled);
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

  const statusText = !enabled
    ? 'Disabled'
    : status?.connected
      ? 'Connected'
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
