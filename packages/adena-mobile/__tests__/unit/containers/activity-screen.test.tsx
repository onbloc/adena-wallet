import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ActivityScreen } from '../../../src/containers/main/activity-screen';
import { Activity } from '../../../src/domain/activity';
import { renderScreen, resetStores, setupWallet } from '../../helpers/render-screen';

jest.setTimeout(20_000);

const activity = (hash: string, title: string): Activity => ({
  hash,
  type: 'CONTRACT_CALL',
  typeName: 'Contract call',
  title,
  status: 'SUCCESS',
  direction: 'none',
  timestamp: '2026-11-20T10:00:00Z',
});

describe('ActivityScreen', () => {
  beforeEach(() => {
    resetStores();
    jest.restoreAllMocks();
  });

  it('pages through history, opens an item and refreshes', async () => {
    const { env } = await setupWallet();
    const first = activity('h1', 'Swap');
    const second = activity('h2', 'Stake');
    const getActivities = jest.spyOn(env.container.activityService, 'getActivities')
      .mockImplementation(async (_account, _network, _filter, cursor) => (cursor
        ? { items: [second], cursor: null, hasNext: false }
        : { items: [first], cursor: 'c1', hasNext: true }));

    jest.spyOn(env.container.tokenService, 'getTokenList').mockResolvedValue([]);
    const { navigation } = await renderScreen(ActivityScreen, { env });

    await fireEvent.press(await screen.findByRole('button', { name: /^Swap/ }));
    expect(navigation.navigate).toHaveBeenCalledWith('ActivityDetail', { activity: first });

    await fireEvent.press(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('button', { name: /^Stake/ })).toBeTruthy();
    expect(getActivities).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), { kind: 'all' }, 'c1');

    const calls = getActivities.mock.calls.length;
    const [scroll] = screen.root!.queryAll(node => typeof node.props.refreshControl?.props?.onRefresh === 'function');

    await act(async () => {
      scroll.props.refreshControl.props.onRefresh();
    });
    await waitFor(() => expect(getActivities.mock.calls.length).toBeGreaterThan(calls));
  });
});
