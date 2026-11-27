import { Switch, Text, TextInput, View } from 'react-native';

import { TEMPERATURE_RANGE } from '../../llm/core';
import { MAX_OUTPUT_TOKENS_RANGE } from '../../llm/device';
import {
  ARGUMENT_SCENARIOS, ENGLISH_SCENARIOS, FOLLOW_UP_SCENARIOS, KOREAN_SCENARIOS,
  READ_SCENARIOS, REPEAT_SCENARIOS, ROUTING_SCENARIOS, SCENARIOS, TYPO_SCENARIOS,
} from '../scenario/scenarios';
import { Button } from './PlaygroundButton';
import { styles } from './playgroundStyles';
import { BENCHMARK_RUNS_RANGE } from './useBenchmark';

/** The scenarios the Benchmark button runs, chosen in Settings. */
export const BENCHMARK_SETS = {
  en: { label: 'English', scenarios: ENGLISH_SCENARIOS },
  ko: { label: 'Korean', scenarios: KOREAN_SCENARIOS },
  all: { label: 'Both', scenarios: SCENARIOS },
  typo: { label: 'Typos', scenarios: TYPO_SCENARIOS },
  args: { label: 'Arguments', scenarios: ARGUMENT_SCENARIOS },
  route: { label: 'Routing', scenarios: ROUTING_SCENARIOS },
  reads: { label: 'Reads', scenarios: READ_SCENARIOS },
  follow: { label: 'Follow-ups', scenarios: FOLLOW_UP_SCENARIOS },
  repeat: { label: 'Repeat', scenarios: REPEAT_SCENARIOS },
} as const;

type GenerationSettingsProps = {
  temperature: string;
  temperatureValue: number | null;
  setTemperature: (value: string) => void;
  maxTokens: string;
  maxTokensValue: number | null;
  setMaxTokens: (value: string) => void;
  thinking: boolean;
  setThinking: (value: boolean) => void;
};

export function GenerationSettings({ temperature, temperatureValue, setTemperature, maxTokens, maxTokensValue, setMaxTokens, thinking, setThinking }: GenerationSettingsProps) {
  return (
    <>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={styles.label}>
                Temperature ({TEMPERATURE_RANGE.min}-{TEMPERATURE_RANGE.max})
              </Text>
              <TextInput
                style={[styles.input, temperatureValue === null && styles.invalid]}
                value={temperature}
                onChangeText={setTemperature}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.flex}>
              <Text style={styles.label}>
                Max tokens ({MAX_OUTPUT_TOKENS_RANGE.min}-{MAX_OUTPUT_TOKENS_RANGE.max})
              </Text>
              <TextInput
                style={[styles.input, maxTokensValue === null && styles.invalid]}
                value={maxTokens}
                onChangeText={setMaxTokens}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.rowCenter}>
            <Switch value={thinking} onValueChange={setThinking} />
            <Text style={styles.switchLabel}>Thinking (reasoning)</Text>
          </View>
    </>
  );
}

type BenchmarkSettingsProps = {
  benchRuns: string;
  benchRunsValue: number | null;
  setBenchRuns: (value: string) => void;
  benchSet: keyof typeof BENCHMARK_SETS;
  setBenchSet: (value: keyof typeof BENCHMARK_SETS) => void;
  running: boolean;
};

export function BenchmarkSettings({ benchRuns, benchRunsValue, setBenchRuns, benchSet, setBenchSet, running }: BenchmarkSettingsProps) {
  return (
    <>
          <Text style={styles.label}>Benchmark runs ({BENCHMARK_RUNS_RANGE.min}-{BENCHMARK_RUNS_RANGE.max})</Text>
          <TextInput
            style={[styles.input, benchRunsValue === null && styles.invalid]}
            value={benchRuns}
            onChangeText={setBenchRuns}
            keyboardType="number-pad"
            editable={!running}
          />
          <Text style={styles.label}>Benchmark scenarios</Text>
          <View style={styles.wrapRow}>
            {(Object.keys(BENCHMARK_SETS) as (keyof typeof BENCHMARK_SETS)[]).map((id) => (
              <Button
                key={id}
                label={`${benchSet === id ? '● ' : ''}${BENCHMARK_SETS[id].label} (${BENCHMARK_SETS[id].scenarios.length})`}
                onPress={() => setBenchSet(id)}
                disabled={running}
              />
            ))}
          </View>
          <Text style={styles.muted}>
            Benchmark button: with an empty prompt box it runs the chosen scenarios this many times; with
            text in the box it runs that prompt (any language) this many times and counts the different
            transactions. Fixed: temperature 0, 512 output tokens, no thinking, a mock wallet and fake
            Onbloc reads (no network). Repeat samples at temperature 0.7 instead, to measure how often
            the model gets its hard cases right: set Benchmark runs to 30-100.
          </Text>
    </>
  );
}
