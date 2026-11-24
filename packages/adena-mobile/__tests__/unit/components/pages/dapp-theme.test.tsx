import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { DappMessageList } from '../../../../src/components/pages/dapp-request/dapp-message-list';
import { ColorScheme } from '../../../../src/domain/preferences';
import { themeColors } from '../../../../src/theme';
import { withScheme } from '../../../helpers/theme';

const messages = [{ title: 'Deploy', details: [], code: [{ name: 'counter.gno', body: 'package counter' }] }];

describe.each<ColorScheme>(['light', 'dark'])('DappMessageList (%s)', (scheme) => {
  it('draws code on the canvas inside a subtle card', async () => {
    const onToggleCode = jest.fn();
    const { rerender } = await render(withScheme(scheme, <DappMessageList messages={messages} onToggleCode={onToggleCode} />));

    await fireEvent.press(screen.getByTestId('dapp-code-toggle-0:0'));
    expect(onToggleCode).toHaveBeenCalledWith('0:0');
    await rerender(withScheme(scheme, <DappMessageList messages={messages} expandedCode={['0:0']} />));
    expect(screen.getByTestId('dapp-code-body-0:0')).toHaveStyle({
      color: themeColors[scheme].text.primary,
      backgroundColor: themeColors[scheme].background.canvas,
    });
  });
});
