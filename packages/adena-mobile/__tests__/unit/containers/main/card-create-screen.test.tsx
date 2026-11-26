import { fromBase64 } from '@cosmjs/encoding';
import { MsgCreateSession } from '@gnolang/gno-js-client';
import { Tx } from '@gnolang/tm2-js-client';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CardCreateScreen } from '../../../../src/containers/main/card-create-screen';
import { SpendPeriod } from '../../../../src/domain/session-card';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../../helpers/render-screen';
import { createTestContainer } from '../../../helpers/test-container';

const REALM = 'gno.land/r/demo/bank';
const TOKEN = 'gno.land/r/demo/bank/token';

const setup = async () => {
  const env = createTestContainer();
  const wallet = await setupWallet(env);

  env.gno.state.balances[wallet.address] = '100000000ugnot';
  env.gno.state.realmPaths = [REALM, TOKEN];
  env.gno.state.signatures[TOKEN] = [{ FuncName: 'Transfer', Results: [] }];

  return { ...wallet, ...(await renderScreen(CardCreateScreen, { env })) };
};

const next = async (): Promise<void> => {
  await fireEvent.press(screen.getByTestId('card-continue'));
};

describe('CardCreateScreen', () => {
  beforeEach(resetStores);

  it('walks Where, Limit, Until and Name, then issues the card on a hold', async () => {
    const { env, navigation, address } = await setup();

    expect(screen.getByText('Step 1 of 4')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('card-realm-input'), REALM);
    await fireEvent.press(screen.getByTestId('card-realm-add'));
    expect(await screen.findByText(`Can move your tokens: ${TOKEN}`)).toBeTruthy();
    expect(screen.getByText('Opens 2 realms')).toBeTruthy();

    await next();
    expect(screen.getByText('How much can it spend?')).toBeTruthy();
    expect(screen.getByTestId('card-continue')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('card-amount-input'), '2.5');
    await fireEvent.press(screen.getByText('Every day'));

    await next();
    expect(screen.getByText('Until when?')).toBeTruthy();
    // A one-hour card cannot have a daily reset.
    expect(screen.getByRole('button', { name: '1 hour' })).toBeDisabled();
    await fireEvent.press(screen.getByText('7 days'));

    await next();
    await fireEvent.changeText(screen.getByTestId('card-name-input'), 'Bank bot');
    await next();

    expect(await screen.findByText('Issue card')).toBeTruthy();
    expect(screen.getByText('Opens your token balances')).toBeTruthy();
    expect(screen.getByText('2.5 GNOT, plus the tokens those realms can move')).toBeTruthy();

    // A tap is not enough.
    await fireEvent.press(screen.getByTestId('review-confirm'));
    expect(env.gno.state.broadcasts).toHaveLength(0);

    await fireEvent(screen.getByTestId('review-confirm'), 'longPress');
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());

    const tx = Tx.decode(fromBase64(env.gno.state.broadcasts[0]));
    const message = MsgCreateSession.decode(tx.messages[0].value);

    expect(message).toMatchObject({ creator: address, allow_paths: [`vm/exec:${REALM}`], spend_limit: '2500000ugnot', spend_period: BigInt(SpendPeriod.DAILY) });
    expect(toastMessage()).toBe('Card issued');
  });

  it('rejects malformed, duplicate and undeployed realms', async () => {
    await setup();

    await fireEvent.changeText(screen.getByTestId('card-realm-input'), 'gno.land/p/demo/avl');
    await fireEvent.press(screen.getByTestId('card-realm-add'));
    expect(screen.getByText('Use a realm path that starts with gno.land/r/')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('card-realm-input'), 'gno.land/r/demo/missing');
    await fireEvent.press(screen.getByTestId('card-realm-add'));
    expect(await screen.findByText('Nothing is deployed at gno.land/r/demo/missing')).toBeTruthy();
    expect(screen.getByTestId('card-continue')).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('card-realm-input'), REALM);
    await fireEvent.press(screen.getByTestId('card-realm-add'));
    await fireEvent.changeText(screen.getByTestId('card-realm-input'), TOKEN);
    await fireEvent.press(screen.getByTestId('card-realm-add'));
    expect(screen.getByText(`Already covered by ${REALM}`)).toBeTruthy();
  });
});
