import { fromBase64 } from '@cosmjs/encoding';
import { MsgCall } from '@gnolang/gno-js-client';
import { Tx } from '@gnolang/tm2-js-client';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { OrderCreateScreen } from '../../../../src/containers/main/order-create-screen';
import { derivePackageAddress } from '../../../../src/utils/address';
import { GNS, installGnoswapFakes, WUGNOT } from '../../../helpers/gnoswap-fakes';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../../helpers/render-screen';
import { createTestContainer } from '../../../helpers/test-container';

const DCA = 'gno.land/r/gnoswap/order/dca';

const setup = async () => {
  const env = createTestContainer();
  const wallet = await setupWallet(env);

  installGnoswapFakes(env);
  const swapEvaluate = env.gno.state.evaluate;

  env.gno.state.balances[wallet.address] = '1000000000ugnot';
  env.gno.state.evaluate = (pkgPath: string, expression: string): string => {
    if (expression === 'Address()') {
      return `("${derivePackageAddress(pkgPath)}" .uverse.address)`;
    }

    if (pkgPath === 'gno.land/r/gnoswap/order/whitelist') {
      return '(true bool)';
    }

    if (pkgPath === DCA) {
      return '("86400:3600,604800:86400," string)\n(1000000 int64)\n(365 int64)\n(15 int64)\n("1" string)';
    }

    return swapEvaluate(pkgPath, expression);
  };

  return { ...wallet, ...(await renderScreen(OrderCreateScreen, { env, params: { kind: 'dca' } })) };
};

describe('OrderCreateScreen', () => {
  beforeEach(resetStores);

  it('starts a weekly GNOT -> GNS recurring buy after a hold', async () => {
    const { env, navigation } = await setup();

    expect(await screen.findByText('Every week')).toBeTruthy();
    expect(screen.getByText('GNS')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('order-amount-input'), '0.5');
    expect(screen.getByText('At least 1 GNOT')).toBeTruthy();
    expect(screen.getByTestId('order-review')).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('order-amount-input'), '5');
    await fireEvent.press(screen.getByText('Every week'));
    await fireEvent.changeText(screen.getByTestId('order-count-input'), '4');
    expect(screen.getByText('20 GNOT')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('order-review'));
    expect(await screen.findByText('Start recurring buy')).toBeTruthy();
    await fireEvent(screen.getByTestId('review-confirm'), 'longPress');
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());

    const calls = Tx.decode(fromBase64(env.gno.state.broadcasts[0])).messages.map(message => MsgCall.decode(message.value));

    expect(calls.map(call => call.func)).toEqual(['Deposit', 'Approve', 'CreateOrder']);
    expect(calls[2].args.slice(0, 3)).toEqual([WUGNOT, GNS, '604800']);
    expect(calls[2].args.slice(4)).toEqual(['5000000', '4']);
    expect(toastMessage()).toBe('Recurring buy started');
  });
});
