import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

import { ChatScreen } from '../../../../src/containers/main/chat-screen';
import { AiRunEvent, AiTransferDraft } from '../../../../src/domain/ai';
import { renderScreen, resetStores, setupWallet } from '../../../helpers/render-screen';
import { createTestContainer } from '../../../helpers/test-container';

const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const setup = async () => {
  const { env, account, network, address } = await setupWallet(createTestContainer());

  env.gno.state.balances[address] = '10000000ugnot';

  const service = env.container.aiAssistantService;
  const token = { ...network.nativeToken, name: 'Gno.land', family: network.family, type: 'native' as const, isNative: true, networkId: network.id };
  const draftFor = async (id: string): Promise<AiTransferDraft> => ({
    id,
    account,
    network,
    token,
    amount: '1000000',
    toAddress: RECIPIENT,
    draft: await env.container.transactionService.createTransferDraft({ account, network, token, toAddress: RECIPIENT, amount: '1000000' }),
  });
  const done: AiRunEvent = { type: 'done', aborted: false, warnings: [] };

  jest.spyOn(service, 'getConfig').mockResolvedValue({ provider: 'openai', model: 'm', hasApiKey: true, models: [] });
  jest.spyOn(service, 'getTurns').mockResolvedValue([]);
  const record = jest.spyOn(service, 'recordTransferOutcome').mockImplementation(() => undefined);
  const run = jest.spyOn(service, 'run');
  const ask = async (text: string): Promise<void> => {
    await fireEvent.changeText(screen.getByTestId('chat-input'), text);
    await fireEvent.press(screen.getByTestId('chat-send'));
  };

  return { env, draftFor, done, record, run, ask };
};

describe('ChatScreen transfer drafts', () => {
  beforeEach(resetStores);
  afterEach(() => jest.restoreAllMocks());

  it('stops only the running reply: drafts from earlier replies stay reviewable', async () => {
    const { env, draftFor, done, run, ask } = await setup();
    const first = await draftFor('first');
    const second = await draftFor('second');

    run.mockImplementationOnce(async function* () {
      yield { type: 'draft', draft: first };
      yield done;
    });
    run.mockImplementationOnce(async function* ({ signal }) {
      yield { type: 'draft', draft: second };
      const aborted = Promise.withResolvers<void>();

      signal?.addEventListener('abort', () => aborted.resolve());
      await aborted.promise;
      yield { ...done, aborted: true };
    });
    await renderScreen(ChatScreen, { env });
    await ask('send 1 GNOT');
    await screen.findByTestId('chat-draft-review-first');
    await ask('send 1 GNOT again');
    await screen.findByTestId('chat-draft-review-second');
    await fireEvent.press(screen.getByTestId('chat-stop'));

    await waitFor(() => expect(within(screen.getByTestId('chat-draft-second')).getByText('Dismissed')).toBeTruthy());
    expect(screen.getByTestId('chat-draft-review-first')).toBeTruthy();
  });

  it('keeps a prepared transfer reviewable through a transient inactive state, and dismisses it once the app is backgrounded', async () => {
    const { env, draftFor, done, run, ask } = await setup();
    const draft = await draftFor('transfer');
    let notify: (state: AppStateStatus) => void = () => undefined;

    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      notify = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    });
    run.mockImplementationOnce(async function* () {
      yield { type: 'draft', draft };
      yield done;
    });
    await renderScreen(ChatScreen, { env });
    await ask('send 1 GNOT');
    await screen.findByTestId('chat-draft-review-transfer');

    await act(async () => notify('inactive'));
    expect(screen.getByTestId('chat-draft-review-transfer')).toBeTruthy();

    await act(async () => notify('background'));
    await waitFor(() => expect(within(screen.getByTestId('chat-draft-transfer')).getByText('Dismissed')).toBeTruthy());
  });

  it('marks a confirmed transfer Sent once, tells the assistant, and shows no warning for it', async () => {
    const { env, draftFor, done, run, record, ask } = await setup();
    const draft = await draftFor('transfer');

    run.mockImplementationOnce(async function* () {
      yield { type: 'draft', draft };
      yield done;
    });
    await renderScreen(ChatScreen, { env });
    await ask('send 1 GNOT');
    await fireEvent.press(await screen.findByTestId('chat-draft-review-transfer'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Confirm send' }));

    await waitFor(() => expect(within(screen.getByTestId('chat-draft-transfer')).getByText('Sent')).toBeTruthy());
    expect(record).toHaveBeenCalledWith({ networkId: draft.network.id, accountId: draft.account.id }, draft, 'sent');
    expect(screen.queryByText('Transaction confirmed.')).toBeNull();
    expect(screen.queryByTestId('chat-draft-activity-transfer')).toBeNull();
  });

  it('points an unconfirmed transfer to Activity instead of calling it dismissed', async () => {
    const { env, draftFor, done, run, record, ask } = await setup();
    const draft = await draftFor('transfer');

    jest.spyOn(env.container.transactionService, 'signAndBroadcast').mockImplementation(async (_draft, _account, _network, options) => {
      options?.onSigned?.('HASH');
      throw new Error('socket closed');
    });
    run.mockImplementationOnce(async function* () {
      yield { type: 'draft', draft };
      yield done;
    });
    const { navigation } = await renderScreen(ChatScreen, { env });

    await ask('send 1 GNOT');
    await fireEvent.press(await screen.findByTestId('chat-draft-review-transfer'));
    await fireEvent.press(await screen.findByRole('button', { name: 'Confirm send' }));

    const card = await screen.findByTestId('chat-draft-transfer');

    await waitFor(() => expect(within(card).getByText('Check Activity')).toBeTruthy());
    expect(within(card).queryByText('Dismissed')).toBeNull();
    expect(record).toHaveBeenCalledWith(expect.anything(), draft, 'unconfirmed');
    await fireEvent.press(screen.getByTestId('chat-draft-activity-transfer'));

    expect(navigation.navigate).toHaveBeenCalledWith('Main', { screen: 'Activity' });
  });
});
