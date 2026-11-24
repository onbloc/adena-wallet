import { Network } from '../domain/network';
import { EXPLORE_APPS, ExploreApp } from '../resources';

export class ExploreService {
  constructor(private readonly apps: ExploreApp[] = EXPLORE_APPS) {}

  // Apps are curated per chain family, so AtomOne networks do not list Gno dApps.
  getApps(network: Network): ExploreApp[] {
    return this.apps.filter(app => app.families.includes(network.family));
  }
}
