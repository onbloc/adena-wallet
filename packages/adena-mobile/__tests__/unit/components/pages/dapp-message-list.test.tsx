import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { DappMessageList, DappRequester } from '../../../../src/components/pages';

describe('DappMessageList', () => {
  const messages = [{
    title: 'Run',
    warning: 'This runs code with your account\'s permissions.',
    details: [{ label: 'Arguments', value: '1. "a"\n2. "b"' }],
    code: [{ name: 'main.gno', body: 'package main\nfunc main() {}' }],
  }];

  it('shows the warning, file and the full source once opened', async () => {
    const onToggleCode = jest.fn();
    const view = await render(<DappMessageList messages={messages} onToggleCode={onToggleCode} codeReviewPending />);

    expect(screen.getByText('This runs code with your account\'s permissions.')).toBeTruthy();
    expect(screen.getByText('main.gno · 2 lines')).toBeTruthy();
    expect(screen.getByText('Open every code file to enable approval.')).toBeTruthy();
    expect(screen.queryByTestId('dapp-code-body-0:0')).toBeNull();
    await fireEvent.press(screen.getByTestId('dapp-code-toggle-0:0'));
    expect(onToggleCode).toHaveBeenCalledWith('0:0');

    await view.rerender(<DappMessageList messages={messages} expandedCode={['0:0']} onToggleCode={onToggleCode} />);
    expect(screen.getByTestId('dapp-code-body-0:0').props.children).toBe('package main\nfunc main() {}');
    expect(screen.getByRole('button', { name: 'Hide code' })).toBeTruthy();
  });
});

describe('DappRequester', () => {
  it('labels the self-declared return address as unverified and shows the Android caller', async () => {
    await render(<DappRequester dappName='Example' origin='https://dapp.example.com' callerPackage='com.android.chrome' />);

    expect(screen.getByText('Return to https://dapp.example.com · unverified')).toBeTruthy();
    expect(screen.getByText('Opened by com.android.chrome (reported by Android)')).toBeTruthy();
  });

  it('omits the caller line when Android did not report one', async () => {
    await render(<DappRequester dappName='Example' origin='exampleapp:' />);

    expect(screen.queryByTestId('dapp-caller')).toBeNull();
  });
});
