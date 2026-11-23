# adena-ai

On-device LLM PoC: run a GGUF model (default: Qwen3.5-2B Q4_K_M) in React Native via
[Callstack React Native AI](https://www.react-native-ai.dev/docs/llama/getting-started)
(`@react-native-ai/llama` on top of `llama.rn`) and test generation from a playground screen.
It also checks whether the model turns plain-text wallet requests (Korean) into the right
tool calls against a **mock wallet**.

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
src/llm/config.ts         Model ID, context size, default generation settings, MAX_STEPS
src/llm/runtime.ts        LlamaRuntime: download -> load -> unload/remove, status + load time
src/llm/generate.ts       Streaming generation + tool calling (multi-step): events, TTFT, tok/s, warnings
src/llm/calls.ts          Folds tool events into an ordered call list
src/llm/useLlm.ts         React hook over runtime + generation
src/wallet/mockWallet.ts  In-memory accounts/balances; get_balance, transfer, sign_message; call log
src/wallet/tools.ts       zod tool definitions whose execute calls the mock wallet
src/wallet/prompts.ts     Korean system prompt (accounts, contacts, rules)
src/wallet/scenarios.ts   Test scenarios with expected calls (from the PoC plan)
src/wallet/evaluate.ts    Scenario pass/fail checks
src/wallet/amount.ts      Decimal strings <-> bigint base units (no floats)
src/ui/PlaygroundScreen   Model controls, scenarios, prompt, options, tool calls, verdict, metrics
```

## Wallet tool calling

With **Wallet tools** on (default), the model gets three tools, and the AI SDK runs the ones it
calls against `MockWallet`, feeding results back for up to `MAX_STEPS` model calls (so
"half of my balance" can be `get_balance` -> `transfer`).

- Tool arguments are validated with zod before `execute`. A call that fails validation (wrong
  type, unknown tool, unparsable JSON) is shown as **[INVALID]** and never reaches the wallet;
  the SDK feeds the error back to the model, which may retry.
- Value checks (address format, amount > 0, balance) live in `MockWallet`, so a well-formed but
  wrong value shows up as a wallet error result instead.
- `transfer` and `sign_message` never execute: they return `pending_approval`.
- Pick a scenario chip to fill the prompt and see the expected calls; after the run you get
  PASS/FAIL per check. The evaluation is strict: any invalid call fails it even if a retry
  succeeds. The "answer mentions" checks are a keyword heuristic.
- Mock data (addresses, balances, token decimals, address format) are assumptions, not real
  Gno.land values. Scenarios that need a recipient include an address in the prompt.

## Eval against a real model (desktop)

`npm test` uses a mock model, so it only proves the harness and wallet code are correct.
To measure what the model itself does, run the scenarios against the same GGUF served by
llama.cpp on your machine. This exercises the real tool-calling behavior with the app's own
tools, prompt, and scoring (not the on-device runtime: no `llama.rn`, speed/memory are the
desktop's, not the phone's).

```bash
brew install llama.cpp   # one time; needs bun for the runner
llama-server -hf bartowski/Qwen_Qwen3.5-2B-GGUF:Q4_K_M --jinja -c 4096 -np 1 --reasoning off --port 8089

npm run eval -- --runs 10 --verbose                 # all scenarios, 10 runs each
npm run eval -- --scenario transfer,compound --runs 20 --out result.json
npm run eval -- --system-file my-prompt.txt         # try another system prompt
```

Results are probabilistic: read them as pass rates, not pass/fail. Run `i` uses `seed + i`, so
an invocation is repeatable against the same server build. `--reasoning off` matches the app's
default (thinking off); drop it to evaluate with thinking.

## Metrics

- **TTFT**: start -> first text or reasoning delta.
- **tok/s**: decode speed, `(outputTokens - 1) / (end - first delta)`. Shown
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
npm run eval   # real-model scenarios; needs llama-server (see above), not part of npm test
```

Shortcuts (`make help`):

```bash
make init   # npm install; installs bun and llama.cpp via brew if missing
make test   # typecheck + lint + jest (mock model, no LLM)
make eval   # real-model scenarios on this Mac; starts llama-server if none is running,
            # stops it afterwards. e.g. make eval RUNS=20 ARGS="--scenario transfer --verbose"
```
