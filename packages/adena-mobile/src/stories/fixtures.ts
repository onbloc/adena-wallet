// Shared sample data for page stories; public test addresses only.
import { AiSettingsSheetProps } from '../components/molecules';
import { ChatDraftReview, DappMessageView } from '../components/pages';
import { AssetItemView, ChatDraftView, ChatMessageView, NftCardView } from '../components/view-models';
import { FeeTier } from '../domain/fee';

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

export const SWAP_MESSAGES: DappMessageView[] = [
  { title: 'Call', details: [{ label: 'Function', value: 'Approve' }, { label: 'Package', value: 'gno.land/r/gnoland/wugnot' }, { label: 'Arguments', value: 'g1vc883gshu5z7ytk5cdynhc8c2dh67pdp4cszkp, 1000000' }] },
  { title: 'Call', details: [{ label: 'Function', value: 'Deposit' }, { label: 'Package', value: 'gno.land/r/gnoland/wugnot' }, { label: 'Send', value: '1 GNOT' }] },
  { title: 'Call', details: [{ label: 'Function', value: 'ExactInSwapRoute' }, { label: 'Package', value: 'gno.land/r/gnoswap/router' }, { label: 'Arguments', value: 'wugnot → GNS, 1000000, min 4550753' }] },
];

export const CHAT_DRAFT: ChatDraftView = {
  id: 'draft-1',
  title: 'Send 1 GNOT',
  rows: [
    { label: 'To', value: SAMPLE_RECIPIENT, multiline: true },
    { label: 'Amount', value: '1 GNOT' },
    { label: 'Network', value: 'Gno.land Mainnet' },
  ],
  state: 'pending',
};

export const CHAT_MESSAGES: ChatMessageView[] = [
  { id: 'm1', role: 'user', text: 'What is my GNOT balance?' },
  { id: 'm2', role: 'assistant', text: 'You hold 11,301.850689 GNOT on Gno.land Mainnet.', tools: [{ id: 't1', label: 'Get balance', status: 'done' }] },
  { id: 'm3', role: 'user', text: `Send 1 GNOT to ${SAMPLE_RECIPIENT}` },
  {
    id: 'm4',
    role: 'assistant',
    text: 'I prepared the transfer. Review it before sending.',
    warnings: ['This address has never received funds from you.'],
    drafts: [CHAT_DRAFT],
  },
];

export const CHAT_SETTINGS: AiSettingsSheetProps = {
  visible: false,
  provider: 'openai',
  onChangeProvider: () => undefined,
  apiKey: '',
  hasApiKey: false,
  onChangeApiKey: () => undefined,
  onRemoveApiKey: () => undefined,
  model: 'gpt-4o-mini',
  modelOptions: [
    { value: 'gpt-4o-mini', label: 'GPT-4o mini' },
    { value: 'gpt-4o', label: 'GPT-4o' },
  ],
  onChangeModel: () => undefined,
  local: { state: 'idle' },
  onLoadLocal: () => undefined,
  onUnloadLocal: () => undefined,
  onRemoveLocal: () => undefined,
  saving: false,
  onSave: () => undefined,
  onClose: () => undefined,
};

export const CHAT_REVIEW: ChatDraftReview = {
  title: 'Review transfer',
  rows: [
    { label: 'To', value: SAMPLE_RECIPIENT, multiline: true },
    { label: 'Amount', value: '1 GNOT', emphasis: true },
  ],
  fee: {
    options: [
      { tier: FeeTier.SLOW, label: 'Slow', feeLabel: '0.1003 GNOT' },
      { tier: FeeTier.AVERAGE, label: 'Average', feeLabel: '0.1103 GNOT' },
      { tier: FeeTier.FAST, label: 'Fast', feeLabel: '0.1204 GNOT' },
    ],
    selected: FeeTier.AVERAGE,
    onSelect: () => undefined,
    customAdjustment: '1',
    onChangeCustomAdjustment: () => undefined,
    tooLow: false,
  },
  totalLabel: '1.1103 GNOT',
  confirming: false,
  onConfirm: () => undefined,
  onClose: () => undefined,
};
