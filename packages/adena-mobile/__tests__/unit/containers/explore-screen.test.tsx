import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { ExploreScreen } from '../../../src/containers/main/explore-screen';
import { renderScreen, resetStores } from '../../helpers/render-screen';
import { createTestContainer } from '../../helpers/test-container';

describe('ExploreScreen', () => {
  beforeEach(resetStores);

  it('lists the network apps and opens the selected one', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const env = createTestContainer();
    const [app] = env.container.exploreService.getApps(env.container.networkService.getCurrentNetwork());

    await renderScreen(ExploreScreen, { env });
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${app.name}`) }));

    expect(openURL).toHaveBeenCalledWith(app.url);
  });
});
