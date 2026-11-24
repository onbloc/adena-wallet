import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Text, TextColor } from '../../../../src/components/atoms';
import { lightColors } from '../../../../src/theme';

describe('Text', () => {
  it('uses body/primary by default', async () => {
    await render(<Text>Hello</Text>);
    expect(screen.getByText('Hello')).toHaveStyle({ color: lightColors.text.primary });
  });

  it.each<TextColor>(['secondary', 'inverse', 'disabled', 'success', 'error', 'warning'])('applies the %s color', async (color) => {
    await render(<Text color={color} variant='meta' align='right' tabular style={{ marginTop: 1 }}>{color}</Text>);
    expect(screen.getByText(color)).toHaveStyle({ textAlign: 'right', marginTop: 1 });
  });
});
