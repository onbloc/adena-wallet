import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Text } from '../../../../src/components/atoms';
import { Card } from '../../../../src/components/molecules';

describe('Card', () => {
  it('renders title, description and children', async () => {
    await render(<Card title='Title' description='Desc'><Text>Child</Text></Card>);
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('Desc')).toBeTruthy();
    expect(screen.getByText('Child')).toBeTruthy();
  });

  it('renders empty', async () => {
    await render(<Card />);
    expect(screen.queryByText(/./)).toBeNull();
  });
});
