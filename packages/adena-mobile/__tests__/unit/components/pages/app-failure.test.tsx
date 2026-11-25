import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { AppFailurePage } from '../../../../src/components/pages';
import { renderPage } from './render-page';

describe('AppFailurePage', () => {
  it('renders the message and every action', async () => {
    const retry = jest.fn();
    const reset = jest.fn();

    await renderPage(
      <AppFailurePage
        title='Something went wrong'
        description='Adena could not start.'
        actions={[{ label: 'Try again', onPress: retry }, { label: 'Reset wallet', tone: 'secondary', onPress: reset }]}
      />,
    );

    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Adena could not start.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Reset wallet' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('renders without actions', async () => {
    await renderPage(<AppFailurePage title='Unsupported' description='Update the app.' />);

    expect(screen.getByText('Unsupported')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
