import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Avatar } from '../../../../src/components/atoms';
import { AppThemeContext } from '../../../../src/hooks/use-app-theme';
import { darkColors } from '../../../../src/theme';
import { getInitials } from '../../../../src/utils/address';

describe('Avatar', () => {
  it('renders initials with the default and a custom size', async () => {
    const { rerender } = await render(<Avatar name='Adena Wallet' />);

    expect(screen.getByText(getInitials('Adena Wallet'))).toBeTruthy();
    await rerender(<Avatar name='x' size={48} />);
    expect(screen.getByText(getInitials('x'))).toBeTruthy();
  });

  it('handles an empty name', async () => {
    await render(<Avatar name='' />);
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('Avatar color', () => {
  it('uses the given background color with white initials', async () => {
    await render(<Avatar name='Adena' color='teal' />);
    expect(JSON.stringify(screen.toJSON())).toContain('#0E7490');
    expect(screen.getByText('AD')).toHaveStyle({ color: '#FFFFFF' });
  });

  it('renders "ink" as the inverted primary action in dark mode', async () => {
    await render(<AppThemeContext value={{ preference: 'dark', scheme: 'dark' }}><Avatar name='Adena' color='ink' /></AppThemeContext>);
    expect(JSON.stringify(screen.toJSON())).toContain(darkColors.action.primary);
    expect(screen.getByText('AD')).toHaveStyle({ color: darkColors.text.inverse });
  });
});

describe('Avatar photo', () => {
  it('shows the photo instead of the initials', async () => {
    const uri = 'data:image/jpeg;base64,AAAA';

    await render(<Avatar name='Adena' color='teal' imageUri={uri} size={48} />);
    expect(screen.getByTestId('avatar-photo').props.source).toEqual({ uri });
    expect(screen.queryByText('AD')).toBeNull();
  });
});
