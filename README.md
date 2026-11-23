# adena-ai

On-device LLM PoC: run a GGUF model (default: Qwen3.5-2B Q4_K_M) in React Native via
[Callstack React Native AI](https://www.react-native-ai.dev/docs/llama/getting-started)
(`@react-native-ai/llama` on top of `llama.rn`) and test generation from a playground screen.

## Stack

Expo SDK 58 / React Native 0.88 / TypeScript, AI SDK v7, `@react-native-ai/llama`, `llama.rn`.

## Run

llama.rn is a native module, so **Expo Go does not work**. A dev build is required
(Xcode for iOS, Android SDK for Android).

```bash
npm install
npm run ios       # expo run:ios     (generates ios/ and builds)
npm run android   # expo run:android (generates android/ and builds)
```

First launch: tap **Load**. The model (~1.4 GB) is downloaded from Hugging Face once,
then loaded from local storage (works offline afterwards).

## Structure

```
polyfills.js              Web APIs the AI SDK needs (imported first in index.ts)
src/llm/config.ts         Model ID, context size, generation mode + structured schema, defaults
src/llm/runtime.ts        LlamaRuntime: download -> load -> unload/remove, status + load time
src/llm/generate.ts       Generation (text / structured): events, TTFT, tok/s, warnings
src/llm/useLlm.ts         React hook over runtime + generation
src/ui/PlaygroundScreen   Model controls, prompt, options, output, metrics
```

## Generation modes

Set `GENERATION_MODE` in `src/llm/config.ts` (hot reloads in a dev build):

| | `'text'` (default) | `'structured'` |
|---|---|---|
| Output | free-form text, streamed | JSON constrained by `STRUCTURED_SCHEMA` (grammar) |
| Thinking | switch | always off (grammar + thinking crashes llama.rn natively) |
| TTFT / tok/s | measured | unavailable: the provider emits the whole JSON at once |

Structured output is guaranteed to match the schema's *shape*, not to have correct *values*.
The UI shows whether the output parses as JSON and pretty-prints it. Edit `STRUCTURED_SCHEMA`
to test other shapes; schema keywords llama.cpp cannot convert to a grammar are unverified.

## Metrics

- **TTFT**: start -> first text or reasoning delta (text mode only).
- **tok/s**: decode speed, `(outputTokens - 1) / (end - first delta)` (text mode only). Shown
  as `-` when the provider reports no usage.
- Provider warnings (e.g. unsupported options) are shown under the output.
- Memory / thermal are not measured in-app; use Xcode Instruments or Android Studio Profiler.

## Notes

- Qwen3.5 thinks by default, which adds latency; the **Thinking** switch is off by default
  (`reasoning: 'none'`).
- `n_ctx` is 4096 (library default 2048). Max output tokens is capped below it.
- Change the model or context size in `src/llm/config.ts`.

## Scripts

```bash
npm run typecheck
npm run lint
npm test
```
