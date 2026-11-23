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
src/llm/config.ts         Model ID, context size, default generation settings
src/llm/runtime.ts        LlamaRuntime: download -> load -> unload/remove, status + load time
src/llm/generate.ts       Streaming generation: text/reasoning events, TTFT, tok/s
src/llm/useLlm.ts         React hook over runtime + generation
src/ui/PlaygroundScreen   Model controls, prompt, options, output, metrics
```

## Metrics

- **TTFT**: start -> first text or reasoning delta.
- **tok/s**: decode speed, `(outputTokens - 1) / (end - first delta)`. Shown as `-` when the
  provider reports no usage.
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
