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

// Generated 16x16 gradient standing in for a picked profile photo.
export const SAMPLE_AVATAR_PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAB30lEQVR42g3LIc6GIACA4f8Q3wE8gAfgAB7A7EgmRnQkEiMyksmZ3jkSiRkdieSMnuj36c/fb6Kb6CfExDAxTsgJNWEm3ESc2CbSRJmoE/fE32+mm+lnxMwwM87IGTVjZtxMnNlm0kyZqTP3/AVNp+k1QjNoRo3UKI3ROE3UbJqkKZqqufUXFrqFfkEsDAvjglxQC2bBLcSFbSEtlIW6cC9fsHSW3iIsg2W0SIuyGIuzRMtmSZZiqZbbfsHTeXqP8Aye0SM9ymM8zhM9myd5iqd6bv+FQBfoAyIwBMaADKiACbhADGyBFCiBGrjDF1a6lX5FrAwr44pcUStmxa3ElW0lrZSVunKvX9jpdvodsTPsjDtyR+2YHbcTd7adtFN26s69f+GgO+gPxMFwMB7IA3VgDtxBPNgO0kE5qAf38YVMl+kzIjNkxozMqIzJuEzMbJmUKZmaufMXTrqT/kScDCfjiTxRJ+bEncST7SSdlJN6cp9fuOgu+gtxMVyMF/JCXZgLdxEvtot0US7qxX19odE1+oZoDI2xIRuqYRquERtbIzVKozbu9oWH7qF/EA/Dw/ggH9SDeXAP8WF7SA/loT7czxdeupf+RbwML+OLfFEv5sW9xJftJb2Ul/pyv/wDjaGkEBBTcVQAAAAASUVORK5CYII=';
