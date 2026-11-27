import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/** The live log of a benchmark. Copy and Clear are available once it has ended or was stopped. */
export function BenchmarkLog({
  tail,
  total,
  running,
  getText,
  onClear,
}: {
  /** The last lines; the card draws only these. */
  tail: readonly string[];
  /** All lines so far. */
  total: number;
  running: boolean;
  /** The whole log. */
  getText: () => string;
  onClear: () => void;
}) {
  const [copied, setCopied] = useState<'copied' | 'failed' | null>(null);

  useEffect(() => {
    if (copied === null) return;
    const timer = setTimeout(() => setCopied(null), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(getText());
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{running ? 'Benchmark (running...)' : 'Benchmark'}</Text>
        <View style={styles.buttons}>
          <Pressable onPress={() => void copy()} disabled={running} style={[styles.button, running && styles.disabled]}>
            <Text style={styles.buttonText}>Copy</Text>
          </Pressable>
          <Pressable onPress={onClear} disabled={running} style={[styles.button, styles.secondary, running && styles.disabled]}>
            <Text style={styles.buttonText}>Clear</Text>
          </Pressable>
        </View>
      </View>
      {copied !== null && (
        <Text style={copied === 'copied' ? styles.ok : styles.error}>
          {copied === 'copied' ? `Copied ${total} lines` : 'Could not copy'}
        </Text>
      )}
      {total > tail.length && <Text style={styles.muted}>... {total - tail.length} earlier lines (Copy includes them)</Text>}
      <Text style={styles.log} selectable>
        {tail.join('\n')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontSize: 13, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 8 },
  button: { backgroundColor: '#2563eb', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  secondary: { backgroundColor: '#6b7280' },
  disabled: { backgroundColor: '#9db7ec' },
  buttonText: { color: '#fff', fontWeight: '600' },
  log: { fontFamily: 'Courier', fontSize: 11 },
  muted: { color: '#666' },
  ok: { color: '#15803d' },
  error: { color: '#d33' },
});
