import React, {useState} from 'react';
import {Pressable, Text} from 'react-native';
import ReactTestRenderer, {act} from 'react-test-renderer';

import {HoldToReveal, WebHoldButton} from '../../src/ui/web';

jest.useFakeTimers();

let revealed = false;
function Toggle({initial}: {initial: boolean}) {
  const [value, setValue] = useState(initial);
  revealed = value;
  return <HoldToReveal revealed={value} onChange={setValue} />;
}

const label = (root: ReactTestRenderer.ReactTestInstance) =>
  root.findByType(Text).props.children;

const press = (
  root: ReactTestRenderer.ReactTestInstance,
  event: 'onPressIn' | 'onPressOut',
) =>
  act(() => {
    root.findByType(Pressable).props[event]?.({});
  });

const wait = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });

describe('HoldToReveal', () => {
  it('hides on a tap and reveals again after a full hold', () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Toggle initial />);
    });
    const root = renderer.root;
    expect(label(root)).toBe('Hide Seed Phrase');

    press(root, 'onPressIn');
    press(root, 'onPressOut');
    expect(revealed).toBe(false);
    expect(label(root)).toBe('Hold to Reveal');

    press(root, 'onPressIn');
    wait(2_000);
    press(root, 'onPressOut');
    expect(revealed).toBe(true);
    expect(label(root)).toBe('Hide Seed Phrase');
  });

  it('stays hidden when released early', () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Toggle initial={false} />);
    });
    const root = renderer.root;
    press(root, 'onPressIn');
    wait(500);
    press(root, 'onPressOut');
    wait(2_000);
    expect(revealed).toBe(false);
  });
});

describe('WebHoldButton', () => {
  it('completes once after a full hold', () => {
    const onComplete = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(
        <WebHoldButton title="Hold" onComplete={onComplete} />,
      );
    });
    const root = renderer.root;
    press(root, 'onPressIn');
    wait(2_000);
    press(root, 'onPressOut');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
