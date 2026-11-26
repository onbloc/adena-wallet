import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native';

import type { PreparedTransaction } from '../../agent';
import type { CallRecord } from '../../llm/core';
import type { RunState } from '../../llm/device';
import { BenchmarkLog } from './BenchmarkLog';
import { Button } from './PlaygroundButton';
import { describeTransaction } from './describeTransaction';
import { styles } from './playgroundStyles';
import type { ChatSessionState } from './useChatSession';
import type { PreparationKind } from './preparationHistory';

type Props = {
  chat: boolean;
  onblocMode: boolean;
  onbloc: boolean;
  useTools: boolean;
  allowTransactionPreparation: boolean;
  preparing: boolean;
  setupError: string | null;
  session: ChatSessionState;
  preparation: { ready: boolean; error: string | undefined; prepared: readonly PreparationKind[]; retry: () => void };
  run: RunState;
  bench: { total: number; tail: readonly string[]; running: boolean; text: () => string; clear: () => void };
  submittedPrompt: string | null;
  remembered: boolean;
  prepared: PreparedTransaction['summary'][];
};

export function PlaygroundTranscript({
  chat, onblocMode, onbloc, useTools, allowTransactionPreparation, preparing, setupError,
  session, preparation, run, bench, submittedPrompt, remembered, prepared,
}: Props) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  return (
      <ScrollView
        ref={scrollRef}
        style={[styles.flex, !chat && styles.hidden]}
        contentContainerStyle={styles.transcript}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => {
          if (chat) scrollRef.current?.scrollToEnd({ animated: run.running });
        }}
      >
        {onblocMode && !onbloc && <Text style={styles.error}>
          Fix the MCP URL and My address in Settings.
        </Text>}
        {onbloc && useTools && (
          <Text style={styles.muted}>
            {allowTransactionPreparation
              ? 'Transaction preparation enabled. Nothing is signed or sent.'
              : 'Read-only. Enable transaction preparation in Settings to prepare transfers or approvals.'}
          </Text>
        )}
        {preparing && <Text style={styles.muted}>Loading balances from Onbloc...</Text>}
        {setupError !== null && <Text style={styles.error}>{setupError}</Text>}
        {session.error && (
          <View>
            <Text style={styles.error}>{session.error}</Text>
            <Button label={session.ready ? 'Retry saving conversation' : 'Retry loading conversation'} onPress={session.retry} />
          </View>
        )}
        {!session.ready && !session.error && <Text style={styles.muted}>Loading conversation...</Text>}
        {preparation.error && (
          <View>
            <Text style={styles.error}>{preparation.error}</Text>
            <Button label={preparation.ready ? 'Retry saving preparation status' : 'Retry loading preparation status'} onPress={preparation.retry} />
          </View>
        )}
        {!preparation.ready && !preparation.error && <Text style={styles.muted}>Loading preparation history...</Text>}
        {preparation.prepared.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>Preparation history</Text>
            {preparation.prepared.map((kind, index) => (
              <Text key={index} style={styles.mono}>
                {kind === 'transfer' ? 'Transfer' : 'Approval'} prepared.
              </Text>
            ))}
            <Text style={styles.muted}>
              This app did not sign or send these transactions. Later wallet activity is unknown.
              Transaction details were not saved and are not restored.
            </Text>
          </View>
        )}
        {session.turns.slice(0, submittedPrompt !== null && remembered ? -1 : undefined).map((turn, index) => (
          <View key={index}>
            <View style={styles.userBubble}><Text style={styles.userText} selectable>{turn.prompt}</Text></View>
            <Text style={styles.output} selectable>{turn.answer}</Text>
          </View>
        ))}
        {submittedPrompt === null && session.ready && !session.turns.length && (
          <Text style={styles.muted}>Send a prompt to start.</Text>
        )}
        {submittedPrompt !== null && (
          <>
            <View style={styles.userBubble}>
              <Text style={styles.userText} selectable>
                {submittedPrompt}
              </Text>
            </View>

            {run.error !== null && <Text style={styles.error}>{run.error}</Text>}
            {run.warnings.map((warning, index) => (
              <Text key={`${index}:${warning}`} style={styles.warning}>
                Warning: {warning}
              </Text>
            ))}

            {(run.calls.length > 0 || run.metrics !== null) && onblocMode && useTools && (
              <CallLog calls={run.calls} />
            )}

            {run.running && run.text === '' && <Text style={styles.muted}>Generating...</Text>}
            <Text style={styles.output} selectable>
              {run.text}
            </Text>
            {run.aborted && <Text style={styles.muted}>(stopped)</Text>}

            {prepared.map((summary, index) => (
              <TransactionCard key={index} summary={summary} />
            ))}

            {run.reasoning !== '' && (
              <>
                <Pressable onPress={() => setShowReasoning((value) => !value)}>
                  <Text style={styles.link}>
                    {showReasoning ? 'Hide' : 'Show'} reasoning ({run.reasoning.length} chars)
                  </Text>
                </Pressable>
                {showReasoning && (
                  <Text style={[styles.output, styles.muted]} selectable>
                    {run.reasoning}
                  </Text>
                )}
              </>
            )}

            {run.metrics && (
              <View style={styles.card}>
                <Text style={styles.mono}>TTFT: {fmt(run.metrics.ttftMs, 'ms')}</Text>
                <Text style={styles.mono}>Total: {fmt(run.metrics.totalMs, 'ms')}</Text>
                <Text style={styles.mono}>Output tokens: {run.metrics.outputTokens ?? '-'}</Text>
                <Text style={styles.mono}>Speed: {fmt(run.metrics.tokensPerSec, 'tok/s', 1)}</Text>
              </View>
            )}
          </>
        )}
        {bench.total > 0 && (
          <BenchmarkLog
            tail={bench.tail}
            total={bench.total}
            running={bench.running}
            getText={bench.text}
            onClear={bench.clear}
          />
        )}
      </ScrollView>
  );
}
const fmt = (value: number | null | undefined, unit: string, digits = 0) =>
  value === null || value === undefined ? '-' : `${value.toFixed(digits)} ${unit}`;

const json = (value: unknown) => JSON.stringify(value) ?? 'undefined';
const compact = (text: string, max: number) => {
  const flat = text.replace(/\s+/g, ' ');
  return flat.length > max ? `${flat.slice(0, max)}...` : flat;
};
function TransactionCard({ summary }: { summary: PreparedTransaction['summary'] }) {
  const { title, rows } = describeTransaction(summary);
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{title}</Text>
      {rows.map(([label, value]) => (
        <Text key={label} style={styles.mono} selectable>
          {label}: {value}
        </Text>
      ))}
      <Text style={styles.muted}>Not signed. Sign it in your wallet.</Text>
    </View>
  );
}

function CallLog({ calls }: { calls: CallRecord[] }) {
  const [open, setOpen] = useState(false);
  const invalid = calls.filter((call) => call.invalid).length;
  return (
    <View style={styles.card}>
      <Pressable onPress={() => setOpen((value) => !value)}>
        <Text style={styles.label}>
          {open ? '▾' : '▸'} Tool calls ({calls.length})
          {invalid > 0 ? ` - ${invalid} invalid` : ''}
        </Text>
      </Pressable>
      {open && calls.length === 0 && <Text style={styles.muted}>The model made no tool call.</Text>}
      {open &&
        calls.map((call, index) => (
          <View key={call.id} style={styles.callRow}>
            <Text style={[styles.mono, call.invalid && styles.error]}>
              #{index + 1} {call.name}({json(call.input)}){call.invalid ? '  [INVALID]' : ''}
            </Text>
            {call.error !== undefined && (
              <Text style={styles.error}>{compact(call.error, 300)}</Text>
            )}
            {call.output !== undefined && (
              <Text style={styles.mono}>-&gt; {json(call.output)}</Text>
            )}
          </View>
        ))}
    </View>
  );
}
