import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { AiSettingsSheetProps } from '../../../components/molecules';
import { Chat } from '../../../components/pages/chat';
import { ChatDraftView, ChatMessageView, ChatSetup } from '../../../components/view-models';
import { AI_CONFIG } from '../../../config/ai';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { AiConfig, AiLocalModel, AiTransferDraft, AiTransferOutcome } from '../../../domain/ai';
import { Token } from '../../../domain/token';
import { useAiTransferReview } from '../../../hooks/use-ai-transfer-review';
import { useWalletSnapshot, WalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useTokenPricesQuery } from '../../../queries/token.queries';
import { PriceService } from '../../../services/price.service';
import { useToastStore } from '../../../stores/toast.store';
import { formatTokenAmount } from '../../../utils/amount';
import { createId } from '../../../utils/id';

const INITIAL_CONFIG: AiConfig = { provider: 'openai', model: AI_CONFIG.defaultModel, hasApiKey: false, models: [] };
const INITIAL_LOCAL: AiSettingsSheetProps['local'] = { state: 'idle' };

const draftView = (draft: AiTransferDraft): ChatDraftView => ({
  id: draft.id,
  title: `Send ${formatTokenAmount(draft.amount, draft.token.decimals)} ${draft.token.symbol}`,
  symbol: draft.token.symbol,
  tokenLocalIcon: draft.token.localIcon,
  tokenImageUrl: draft.token.imageUrl,
  rows: [
    { label: 'From', value: draft.account.name },
    { label: 'To', value: draft.toAddress, multiline: true },
    ...(draft.recipientName ? [{ label: 'Recipient', value: draft.recipientName }] : []),
    { label: 'Network', value: draft.network.networkName },
  ],
  state: 'pending',
});

const Conversation = ({ wallet, onBack, onOpenActivity }: { wallet: WalletSnapshot; onBack: () => void; onOpenActivity: () => void }): ReactElement => {
  const { aiAssistantService: assistant, accountService, networkService } = useContainer();
  const toast = useToastStore(state => state.show);
  const { account, network } = wallet;
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<AiConfig>(INITIAL_CONFIG);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [provider, setProvider] = useState<AiConfig['provider']>('openai');
  const [model, setModel] = useState<string>(AI_CONFIG.defaultModel);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string>();
  const [local, setLocal] = useState<AiSettingsSheetProps['local']>(INITIAL_LOCAL);
  const localModelRef = useRef<AiLocalModel | undefined>(undefined);
  const localUnsubscribeRef = useRef<(() => void) | undefined>(undefined);
  const activeRef = useRef<AbortController | undefined>(undefined);
  const mountedRef = useRef(true);
  const draftsRef = useRef(new Map<string, AiTransferDraft>());
  // Every draft the chat has seen, kept after settling so its card can still show a fiat estimate.
  const draftMetaRef = useRef(new Map<string, AiTransferDraft>());
  // Drafts prepared by the reply that is running.
  const turnDraftsRef = useRef(new Set<string>());
  const [draftTokens, setDraftTokens] = useState<Token[]>([]);
  const scope = { networkId: network.id, accountId: account?.id ?? '' };
  const isCurrentScope = (): boolean => {
    const selectedAccount = accountService.getCurrentAccount();
    const selectedNetwork = networkService.getCurrentNetwork();

    return mountedRef.current && selectedAccount?.id === account?.id && selectedAccount?.publicKey === account?.publicKey
      && selectedNetwork.id === network.id && selectedNetwork.chainId === network.chainId
      && selectedNetwork.rpcUrl === network.rpcUrl && assistant.isSupported(selectedNetwork);
  };

  const settled = useCallback((id: string, outcome: AiTransferOutcome, message?: string): void => {
    const draft = draftsRef.current.get(id);

    draftsRef.current.delete(id);

    if (draft) {
      assistant.recordTransferOutcome({ networkId: draft.network.id, accountId: draft.account.id }, draft, outcome);
    }

    setMessages(current => current.map(item => ({
      ...item,
      drafts: item.drafts?.map(view => view.id === id ? { ...view, state: outcome, message } : view),
    })));
  }, [assistant]);
  const transferReview = useAiTransferReview(account, network, settled);

  // Cancels pending drafts, only the given ones when `ids` is set; an open review of a canceled draft closes with it.
  const dismissDrafts = (ids?: ReadonlySet<string>): void => {
    const matches = (id: string): boolean => !ids || ids.has(id);

    for (const id of [...draftsRef.current.keys()]) {
      if (matches(id)) {
        draftsRef.current.delete(id);
      }
    }

    if (!ids || (transferReview.activeId !== undefined && ids.has(transferReview.activeId))) {
      transferReview.invalidate();
    }

    setMessages(current => current.map(item => ({
      ...item,
      drafts: item.drafts?.map(view => view.state === 'pending' && matches(view.id) ? { ...view, state: 'dismissed' } : view),
    })));
  };

  // `turnOnly` is the Stop button: it ends the running reply and leaves drafts from earlier replies alone.
  const stop = (turnOnly = false): void => {
    activeRef.current?.abort();
    assistant.clearPending(scope);
    dismissDrafts(turnOnly ? turnDraftsRef.current : undefined);
  };

  const refreshConfig = async (): Promise<AiConfig> => {
    const next = await assistant.getConfig();

    if (isCurrentScope()) {
      setConfig(next);
      setProvider(next.provider);
      setModel(next.model);
    }

    return next;
  };

  const observeLocal = async (): Promise<AiLocalModel> => {
    if (!localModelRef.current) {
      const controller = await assistant.getLocalModel();

      if (!isCurrentScope()) {
        return controller;
      }

      localModelRef.current = controller;
      const update = (): void => {
        if (!isCurrentScope()) {
          return;
        }

        const status = controller.getStatus();

        setLocal({ ...status, state: status.state === 'unloading' ? 'loading' : status.state });
      };

      localUnsubscribeRef.current?.();
      localUnsubscribeRef.current = controller.subscribe(update);
      update();
    }

    return localModelRef.current;
  };

  useEffect(() => {
    mountedRef.current = true;
    const draftCache = draftsRef.current;

    void Promise.all([refreshConfig(), assistant.getTurns(scope)])
      .then(async ([next, turns]) => {
        if (!isCurrentScope()) {
          return;
        }

        setMessages(turns.flatMap((turn, index) => [
          { id: `saved-${index}-user`, role: 'user' as const, text: turn.prompt },
          { id: `saved-${index}-assistant`, role: 'assistant' as const, text: turn.answer },
        ]));
        setReady(true);

        if (next.provider === 'local') {
          await observeLocal();
        }
      })
      .catch((error) => {
        if (isCurrentScope()) {
          setSettingsError(toErrorMessage(error));
          setSettingsVisible(true);
        }
      });
    // Only a real background clears the chat state; `inactive` also covers Face ID prompts, system overlays and focus changes.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        stop();
        setApiKey('');
        setSettingsVisible(false);
      }
    });

    return (): void => {
      mountedRef.current = false;
      activeRef.current?.abort();
      assistant.clearPending(scope);
      draftCache.clear();
      localUnsubscribeRef.current?.();
      subscription.remove();
    };
    // Conversation is keyed by the account and network; it never changes scope in place.
    // eslint-disable-next-line @eslint-react/exhaustive-deps
  }, []);

  const send = async (): Promise<void> => {
    const prompt = input.trim();

    if (activeRef.current || !ready || !account || !prompt || !isCurrentScope()) {
      return;
    }

    const controller = new AbortController();
    const id = createId();

    turnDraftsRef.current = new Set();

    activeRef.current = controller;
    setSending(true);
    setInput('');
    setMessages(current => [...current, { id: `${id}-user`, role: 'user', text: prompt }, { id, role: 'assistant', text: '', streaming: true }]);
    const update = (change: (message: ChatMessageView) => ChatMessageView): void => {
      if (isCurrentScope() && !controller.signal.aborted) {
        setMessages(current => isCurrentScope() && !controller.signal.aborted
          ? current.map(message => message.id === id ? change(message) : message)
          : current);
      }
    };

    try {
      for await (const event of assistant.run({ prompt, account, network, signal: controller.signal })) {
        if (controller.signal.aborted || !isCurrentScope()) {
          break;
        }

        switch (event.type) {
          case 'text':
            update(message => ({ ...message, text: message.text + event.delta }));
            break;
          case 'tool': update(message => ({
            ...message,
            tools: [...(message.tools ?? []).filter(tool => tool.id !== event.id), { id: event.id, label: event.name.replace(/_/g, ' '), status: event.status }],
          }));
            break;
          case 'draft':
            draftsRef.current.set(event.draft.id, event.draft);
            draftMetaRef.current.set(event.draft.id, event.draft);
            turnDraftsRef.current.add(event.draft.id);
            setDraftTokens(current => current.some(token => token.id === event.draft.token.id) ? current : [...current, event.draft.token]);
            update(message => ({ ...message, drafts: [...(message.drafts ?? []), draftView(event.draft)] }));
            break;
          case 'error':
            update(message => ({ ...message, error: event.message }));
            break;
          case 'done':
            update(message => ({ ...message, warnings: event.warnings, streaming: false }));
            break;
        }
      }
    }
    catch (error) {
      update(message => ({ ...message, error: toErrorMessage(error) }));
    }
    finally {
      if (activeRef.current === controller) {
        activeRef.current = undefined;

        if (isCurrentScope()) {
          setSending(false);
          setMessages(current => current.map(message => message.id === id
            ? {
                ...message,
                streaming: false,
                text: !message.text && controller.signal.aborted ? 'Response stopped.' : message.text,
              }
            : message));
        }
      }
    }
  };

  const save = async (removeKey = false): Promise<void> => {
    if (saving) {
      return;
    }

    stop();
    setSaving(true);
    setSettingsError(undefined);

    try {
      await assistant.saveConfig({ provider, model, apiKey: removeKey ? null : apiKey.trim() || undefined });

      if (!isCurrentScope()) {
        return;
      }

      await refreshConfig();

      if (!isCurrentScope()) {
        return;
      }

      setApiKey('');
      setReady(true);

      if (provider === 'local') {
        await observeLocal();
      }

      setSettingsVisible(false);
    }
    catch (error) {
      if (isCurrentScope()) {
        setSettingsError(toErrorMessage(error));
      }
    }
    finally {
      if (isCurrentScope()) {
        setSaving(false);
      }
    }
  };

  const localAction = async (action: 'load' | 'unload' | 'remove'): Promise<void> => {
    stop();

    try {
      const controller = await observeLocal();

      if (!isCurrentScope()) {
        return;
      }

      await controller[action]();
    }
    catch (error) {
      if (isCurrentScope()) {
        setSettingsError(toErrorMessage(error));
      }
    }
  };

  const openSettings = (): void => {
    setProvider(config.provider);
    setModel(config.model);
    setApiKey('');
    setSettingsVisible(true);
  };
  const settings: AiSettingsSheetProps = {
    visible: settingsVisible,
    provider,
    model,
    apiKey,
    hasApiKey: config.hasApiKey,
    modelOptions: config.models.map(option => ({ value: option.id, label: option.name })),
    onChangeProvider: (value) => {
      setProvider(value);

      if (value === 'local') {
        void observeLocal().catch(error => setSettingsError(toErrorMessage(error)));
      }
    },
    onChangeModel: setModel,
    onChangeApiKey: setApiKey,
    onRemoveApiKey: (): void => { void save(true); },
    local,
    onLoadLocal: (): void => { void localAction('load'); },
    onUnloadLocal: (): void => { void localAction('unload'); },
    onRemoveLocal: (): void => { void localAction('remove'); },
    saving,
    error: settingsError,
    onSave: (): void => { void save(); },
    onClose: (): void => {
      if (!saving) {
        setApiKey('');
        setSettingsVisible(false);
      }
    },
  };
  const setup: ChatSetup = config.provider === 'local'
    ? { kind: 'local-model', ...local }
    : ready && config.hasApiKey ? { kind: 'ready' } : { kind: 'needs-key' };

  const prices = useTokenPricesQuery(network, draftTokens);
  const viewMessages = useMemo(() => messages.map((message) => {
    if (!message.drafts) {
      return message;
    }

    return {
      ...message,
      drafts: message.drafts.map((view) => {
        const draft = draftMetaRef.current.get(view.id);

        return draft ? { ...view, fiatLabel: PriceService.fiatLabel(draft.amount, draft.token, prices.data) } : view;
      }),
    };
  }), [messages, prices.data]);

  return (
    <Chat
      messages={viewMessages}
      setup={setup}
      settings={settings}
      input={input}
      onChangeInput={setInput}
      sending={sending}
      onSend={(): void => { void send(); }}
      onStop={(): void => stop(true)}
      onOpenSettings={openSettings}
      onBack={onBack}
      onOpenActivity={onOpenActivity}
      review={transferReview.review}
      onNewChat={(): void => {
        stop();
        assistant.reset(scope);
        draftMetaRef.current.clear();
        setDraftTokens([]);
        setMessages([]);
      }}
      onReviewDraft={(id) => {
        const draft = draftsRef.current.get(id);

        if (draft) {
          void transferReview.open(draft).catch(error => toast(toErrorMessage(error), 'error'));
        }
      }}
      onDismissDraft={id => settled(id, 'dismissed')}
      suggestions={['What is my GNOT balance?', 'Show my recent transactions']}
      onSelectSuggestion={setInput}
    />
  );
};

export const ChatScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'Chat'>): ReactElement => {
  const wallet = useWalletSnapshot();
  const { aiAssistantService } = useContainer();

  useEffect(() => {
    if (!wallet.account || !aiAssistantService.isSupported(wallet.network)) {
      navigation.goBack();
    }
  }, [aiAssistantService, navigation, wallet.account, wallet.network]);

  if (!wallet.account || !aiAssistantService.isSupported(wallet.network)) {
    return <></>;
  }

  return (
    <Conversation
      key={`${wallet.account?.id}.${wallet.network.id}.${wallet.network.chainId}.${wallet.network.rpcUrl}`}
      wallet={wallet}
      onBack={navigation.goBack}
      onOpenActivity={(): void => navigation.navigate('Main', { screen: 'Activity' })}
    />
  );
};
