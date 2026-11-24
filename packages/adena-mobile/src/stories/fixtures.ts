// Shared sample data for page stories; public test addresses only.
import { AssetItemView, NftCardView } from '../components/view-models';

export const SAMPLE_ADDRESS = 'g1semyl4hhfvkjmrg3e3ef8v0dkx0d6asffvakl4';
export const SAMPLE_RECIPIENT = 'g17290cwvmrapvp869xfnhhawa8sm9edpufzat7d';

export const SAMPLE_ASSETS: AssetItemView[] = [
  { key: 'ugnot', symbol: 'GNOT', name: 'Gno.land', localIcon: 'gnot', quantity: '11,301.850689 GNOT', value: '$1,243.20', change: '+2.41%', trend: 'positive', loading: false },
  { key: 'gno.land/r/gnoswap/gns.GNS', symbol: 'GNS', name: 'Gnoswap', quantity: '49,985,441.056734 GNS', value: '$812.04', change: '-0.85%', trend: 'negative', loading: false },
  { key: 'gno.land/r/demo/foo.FOO', symbol: 'FOO', name: 'Foo Token', quantity: '0 FOO', trend: 'neutral', loading: false },
];

export const SAMPLE_COLLECTIONS: NftCardView[] = [
  { key: 'gno.land/r/demo/nft', title: 'Gnome Punks', subtitle: '3 items', imageUri: null, imageLoading: false },
  { key: 'gno.land/r/demo/art', title: 'Onbloc Art', subtitle: '1 item', imageUri: null, imageLoading: true },
];
