import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { AiSettingsSheetProps } from '../../../components/molecules';
import { Chat } from '../../../components/pages/chat';
import { ChatMessageView, ChatSetup } from '../../../components/view-models';
import { AI_CONFIG } from '../../../config/ai';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { AiConfig, AiLocalModel, AiTransferDraft } from '../../../domain/ai';
import { useAiTransferReview } from '../../../hooks/use-ai-transfer-review';
import { useWalletSnapshot, WalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useToastStore } from '../../../stores/toast.store';
import { formatTokenAmount } from '../../../utils/amount';
import { createId } from '../../../utils/id';

const INITIAL_CONFIG: AiConfig = { provider: 'openai', model: AI_CONFIG.defaultModel, hasApiKey: false, models: [] };
const INITIAL_LOCAL: AiSettingsSheetProps['local'] = { state: 'idle' };

const draftView = (draft: AiTransferDraft): NonNullable<ChatMessageView['drafts']>[number] => ({
  id: draft.id,
  title: `Send ${formatTokenAmount(draft.amount, draft.token.decimals)} ${draft.token.symbol}`,
  rows: [{ label: 'To', value: draft.toAddress, multiline: true }, { label: 'Network', value: draft.network.networkName }],
  state: 'pending',
});

const Conversation = ({ wallet, onBack }: { wallet: WalletSnapshot; onBack: () => void }): ReactElement => {
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
  const scope = { networkId: network.id, accountId: account?.id ?? '' };
  const isCurrentScope = (): boolean => {
    const selectedAccount = accountService.getCurrentAccount();
    const selectedNetwork = networkService.getCurrentNetwork();

    return mountedRef.current && selectedAccount?.id === account?.id && selectedAccount?.publicKey === account?.publicKey
      && selectedNetwork.id === network.id && selectedNetwork.chainId === network.chainId
      && selectedNetwork.rpcUrl === network.rpcUrl && assistant.isSupported(selectedNetwork);
  };

  const settled = useCallback((id: string, sent: boolean, message?: string): void => {
    draftsRef.current.delete(id);
    setMessages(current => current.map(item => ({
      ...item,
      drafts: item.drafts?.map(draft => draft.id === id ? { ...draft, state: sent ? 'sent' : 'dismissed' } : draft),
      warnings: message && item.drafts?.some(draft => draft.id === id) ? [...(item.warnings ?? []), message] : item.warnings,
    })));
  }, []);
  const transferReview = useAiTransferReview(account, network, settled);

  const invalidateDrafts = (): void => {
    draftsRef.current.clear();
    transferReview.invalidate();
    setMessages(current => current.map(item => ({ ...item, drafts: item.drafts?.map(draft => draft.state === 'pending' ? { ...draft, state: 'dismissed' } : draft) })));
  };

  const stop = (): void => {
    activeRef.current?.abort();
    assistant.clearPending(scope);
    invalidateDrafts();
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
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
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

  return (
    <Chat
      messages={messages}
      setup={setup}
      settings={settings}
      input={input}
      onChangeInput={setInput}
      sending={sending}
      onSend={(): void => { void send(); }}
      onStop={stop}
      onOpenSettings={openSettings}
      onBack={onBack}
      review={transferReview.review}
      onNewChat={(): void => {
        stop();
        assistant.reset(scope);
        setMessages([]);
      }}
      onReviewDraft={(id) => {
        const draft = draftsRef.current.get(id);

        if (draft) {
          void transferReview.open(draft).catch(error => toast(toErrorMessage(error), 'error'));
        }
      }}
      onDismissDraft={id => settled(id, false)}
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

  return <Conversation key={`${wallet.account?.id}.${wallet.network.id}.${wallet.network.chainId}.${wallet.network.rpcUrl}`} wallet={wallet} onBack={navigation.goBack} />;
};
