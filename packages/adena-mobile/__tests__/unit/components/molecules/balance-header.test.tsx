import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { BalanceHeader } from '../../../../src/components/molecules';
import { colors } from '../../../../src/theme';

describe('BalanceHeader', () => {
  it('shows the value and caption', async () => {
    await render(<BalanceHeader value='$10.00' caption='+1%' captionColor='success' />);
    expect(screen.getByText('$10.00')).toBeTruthy();
    expect(screen.getByText('+1%')).toHaveStyle({ color: colors.status.success });
  });

  it('shows a skeleton when loading or the value is unknown', async () => {
    const { rerender } = await render(<BalanceHeader value='$1' loading />);

    expect(screen.getByLabelText('Loading')).toBeTruthy();
    await rerender(<BalanceHeader />);
    expect(screen.getByLabelText('Loading')).toBeTruthy();
  });
});
