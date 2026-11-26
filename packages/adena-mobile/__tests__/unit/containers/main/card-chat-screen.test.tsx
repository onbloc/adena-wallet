import { fromBase64 } from '@cosmjs/encoding';
import { MsgCreateSession } from '@gnolang/gno-js-client';
import { Tx } from '@gnolang/tm2-js-client';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CardChatScreen } from '../../../../src/containers/main/card-chat-screen';
import { SessionTaskStatus } from '../../../../src/domain/session-task';
import { renderScreen, resetStores, setupWallet, toastMessage } from '../../../helpers/render-screen';
import { createTestContainer } from '../../../helpers/test-container';

const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const choose = async (testId: string): Promise<void> => {
  await fireEvent.press(await screen.findByTestId(`card-chat-option-${testId}`));
};

describe('CardChatScreen', () => {
  beforeEach(resetStores);

  it('asks fixed questions, then issues a sending card that schedules its own send', async () => {
    const env = createTestContainer();
    const wallet = await setupWallet(env);

    env.gno.state.balances[wallet.address] = '100000000ugnot';
    const { navigation } = await renderScreen(CardChatScreen, { env });

    expect(screen.getByText('What should this card do?')).toBeTruthy();
    await choose('send');
    expect(screen.getByText('How much can it spend, fees included?')).toBeTruthy();
    await choose('5000000');
    await choose(String(86400));
    await choose('0');
    expect(screen.getByText('Should it send GNOT by itself after a short delay?')).toBeTruthy();
    await choose('yes');
    await choose('enter-address');
    await fireEvent.changeText(screen.getByTestId('card-chat-input'), 'not an address');
    await fireEvent.press(screen.getByTestId('card-chat-submit'));
    expect(screen.getByText('Enter a valid address')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('card-chat-input'), RECIPIENT);
    await fireEvent.press(screen.getByTestId('card-chat-submit'));
    await choose('500000');
    await choose('30');

    expect(screen.getByText('Issue this card?')).toBeTruthy();
    // Answers read back as the user's own messages.
    expect(screen.getByText('5 GNOT')).toBeTruthy();
    expect(screen.getByText('In 30 seconds')).toBeTruthy();

    await choose('issue');
    expect(await screen.findByText('Hold to approve')).toBeTruthy();
    expect(screen.getByText(/Sends 0.5 GNOT to .* in 30 seconds, signed by the card/)).toBeTruthy();
    expect(screen.getByText('Keep the app open until it sends')).toBeTruthy();

    await fireEvent(screen.getByTestId('review-confirm'), 'longPress');
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());

    const message = MsgCreateSession.decode(Tx.decode(fromBase64(env.gno.state.broadcasts[0])).messages[0].value);

    expect(message).toMatchObject({ creator: wallet.address, allow_paths: ['bank/send'], spend_limit: '5000000ugnot', spend_period: 0n });
    expect(toastMessage()).toBe('Card issued');
    expect(env.container.sessionTaskService.list()).toEqual([
      expect.objectContaining({ status: SessionTaskStatus.SCHEDULED, toAddress: RECIPIENT, amount: '500000', masterAddress: wallet.address }),
    ]);
    env.container.sessionTaskService.cancel(env.container.sessionTaskService.list()[0].id);
  });
});
