import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ChatComposer, ChatComposerProps } from '../../../../src/components/molecules';

const props = (overrides: Partial<ChatComposerProps> = {}): ChatComposerProps => ({
  value: 'hello',
  onChangeText: jest.fn(),
  sending: false,
  onSend: jest.fn(),
  onStop: jest.fn(),
  ...overrides,
});

describe('ChatComposer', () => {
  it('reports typing and sends', async () => {
    const composer = props();

    await render(<ChatComposer {...composer} />);
    await fireEvent.changeText(screen.getByTestId('chat-input'), 'hi');
    await fireEvent.press(screen.getByTestId('chat-send'));

    expect(composer.onChangeText).toHaveBeenCalledWith('hi');
    expect(composer.onSend).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('chat-input').props.maxLength).toBe(16000);
  });

  it('cannot send an empty message', async () => {
    const composer = props({ value: '   ' });

    await render(<ChatComposer {...composer} />);
    await fireEvent.press(screen.getByTestId('chat-send'));

    expect(composer.onSend).not.toHaveBeenCalled();
  });

  it('turns into Stop while sending', async () => {
    const composer = props({ sending: true });

    await render(<ChatComposer {...composer} />);
    expect(screen.queryByTestId('chat-send')).toBeNull();
    await fireEvent.press(screen.getByTestId('chat-stop'));

    expect(composer.onStop).toHaveBeenCalledTimes(1);
  });

  it('locks input and send when disabled', async () => {
    const composer = props({ disabled: true, placeholder: 'Set up first' });

    await render(<ChatComposer {...composer} />);
    await fireEvent.press(screen.getByTestId('chat-send'));

    expect(screen.getByTestId('chat-input').props.editable).toBe(false);
    expect(screen.getByTestId('chat-input').props.placeholder).toBe('Set up first');
    expect(composer.onSend).not.toHaveBeenCalled();
  });
});
