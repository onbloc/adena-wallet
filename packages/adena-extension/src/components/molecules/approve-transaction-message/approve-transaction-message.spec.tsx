import React from 'react';
import { RecoilRoot } from 'recoil';
import { ThemeProvider } from 'styled-components';
import { render, screen } from '@testing-library/react';
import theme from '@styles/theme';
import { GlobalPopupStyle } from '@styles/global-style';
import ApproveTransactionMessage, {
  ApproveTransactionMessageProps,
} from './approve-transaction-message';
import { PubKeySecp256k1 } from '@gnolang/tm2-js-client';
import { EMessageType } from '@inject/types';

describe('ApproveTransactionMessage Component', () => {
  const renderMessage = (args: ApproveTransactionMessageProps): void => {
    render(
      <RecoilRoot>
        <GlobalPopupStyle />
        <ThemeProvider theme={theme}>
          <ApproveTransactionMessage {...args} />
        </ThemeProvider>
      </RecoilRoot>,
    );
  };

  it('ApproveTransactionMessage render', () => {
    const args: ApproveTransactionMessageProps = {
      changeMessage: jest.fn(),
      openScannerLink: jest.fn(),
      index: 0,
      editable: true,
      message: {
        type: '/vm.m_call',
        value: {
          args: [],
          caller: '',
          func: '',
          pkg_path: '',
          max_deposit: '',
          send: '',
        },
      },
    };

    renderMessage(args);
  });

  it('renders create session details', async () => {
    const sessionKey = {
      type_url: '/tm.PubKeySecp256k1',
      value: PubKeySecp256k1.encode({ key: TEST_SESSION_PUBLIC_KEY }).finish(),
    };

    renderMessage({
      changeMessage: jest.fn(),
      openScannerLink: jest.fn(),
      index: 0,
      editable: true,
      message: {
        type: EMessageType.AUTH_CREATE_SESSION,
        value: {
          creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
          session_key: sessionKey,
          expires_at: { low: 1779665401, high: 0, unsigned: false },
          allow_paths: ['bank/send'],
          spend_limit: '3000000ugnot',
          spend_period: { low: 0, high: 0, unsigned: false },
        },
      },
    });

    expect(screen.getByText('1. Create Session')).toBeTruthy();
    expect(screen.getByText('MsgCreateSession')).toBeTruthy();
    expect(screen.getByText('g1jg8m...fvsqf5')).toBeTruthy();
    expect(await screen.findByText('g19gpz...vlkk66')).toBeTruthy();
    expect(screen.getByText('1779665401')).toBeTruthy();
    expect(screen.getByText('bank/send')).toBeTruthy();
    expect(screen.getByText('3000000ugnot')).toBeTruthy();
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('renders revoke session details', async () => {
    const sessionKey = {
      type_url: '/tm.PubKeySecp256k1',
      value: PubKeySecp256k1.encode({ key: TEST_SESSION_PUBLIC_KEY }).finish(),
    };

    renderMessage({
      changeMessage: jest.fn(),
      openScannerLink: jest.fn(),
      index: 0,
      editable: true,
      message: {
        type: EMessageType.AUTH_REVOKE_SESSION,
        value: {
          creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
          session_key: sessionKey,
        },
      },
    });

    expect(screen.getByText('1. Revoke Session')).toBeTruthy();
    expect(screen.getByText('MsgRevokeSession')).toBeTruthy();
    expect(await screen.findByText('g19gpz...vlkk66')).toBeTruthy();
  });

  it('renders revoke all sessions details', () => {
    renderMessage({
      changeMessage: jest.fn(),
      openScannerLink: jest.fn(),
      index: 0,
      editable: true,
      message: {
        type: EMessageType.AUTH_REVOKE_ALL_SESSIONS,
        value: {
          creator: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5',
        },
      },
    });

    expect(screen.getByText('1. Revoke All Sessions')).toBeTruthy();
    expect(screen.getByText('MsgRevokeAllSessions')).toBeTruthy();
    expect(screen.getByText('g1jg8m...fvsqf5')).toBeTruthy();
  });
});

const TEST_SESSION_PUBLIC_KEY = Uint8Array.from([
  2, 49, 65, 231, 113, 29, 144, 188, 105, 187, 89, 154, 214, 202, 15, 207, 212, 82, 155, 163, 91,
  48, 144, 178, 84, 87, 160, 241, 228, 131, 137, 198, 30,
]);
