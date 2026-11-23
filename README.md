# adena-ai

On-device LLM PoC: run a GGUF model (default: Qwen3.5-2B Q4_K_M) in React Native via
[Callstack React Native AI](https://www.react-native-ai.dev/docs/llama/getting-started)
(`@react-native-ai/llama` on top of `llama.rn`) and test generation from a playground screen.
It also checks whether the model turns plain-text wallet requests into the right
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
src/wallet/sdk/              Wallet layer (holds the keys): types, MockWalletSdk, fixture, address/token helpers
src/wallet/adapter/tools.ts  LLM layer: zod tools that call the SDK's public methods only
src/wallet/constants.ts      Enum-like constants (ToolName, TokenSymbol, WalletStatus, ...)
src/wallet/prompts.ts        System prompt (contacts, rules)
src/wallet/scenarios.ts      Test scenarios: expected calls, popups, final balances
src/wallet/evaluate.ts       Scenario pass/fail checks over a RunObservation
src/wallet/observation.ts    What a run is judged on (calls, answer, popups, balances)
src/wallet/amount.ts         Decimal strings <-> bigint base units (no floats)
src/ui/PlaygroundScreen   Model controls, scenarios, prompt, options, tool calls, verdict, metrics
```

## Wallet layers and tool calling

```
model --tool call--> adapter (src/wallet/adapter)      LLM layer
                       |  injects the user's address, maps wallet refusals to results,
                       |  and passes a transfer's message on to be signed
                       v  SDK public methods only: no key ever crosses this line
                     WalletSdk (src/wallet/sdk)         wallet layer
                       getBalance(address) -> { GNOT, GNS }
                       transfer({from,to,amount,token}) -> message (moves nothing)
                       sign(message) -> asks the user (popup) -> signed | rejected
```

- The model sees `get_balance()`, `transfer({to,amount,token})`, `sign_message({message})`.
  No account or `from` is ever a model argument: the harness injects the user's own account.
  (An optional `address` on `get_balance` made the 2B model pass the recipient's address or
  `""`, which broke the transfer scenarios, so it was removed.)
- After `transfer`, **the harness** (not the model) passes the wallet-created message to
  `sdk.sign`. The popup shows exactly that message. Funds move only when the user approves
  (signed); on reject nothing moves. The model gets a small `{status: signed | rejected}`.
- The SDK only signs messages it created itself (altered or invented messages are refused
  without asking the user), re-checks the balance at signing time, and applies a message once.
- The private key (a stand-in secret in the mock) never appears in any result, error, popup
  request or log; tests check this.
- In the app, the signing popup is a modal (Approve / Reject). In tests and eval a simulated
  user answers: `autoApproval(ApprovalPolicy.Approve | Reject)`.
- Tool arguments are validated with zod before `execute`. A call that fails validation (wrong
  type, unknown tool, unparsable JSON) is shown as **[INVALID]** and never reaches the wallet;
  the SDK feeds the error back to the model, which may retry.
- Value checks (address format, amount > 0, balance) live in the SDK, so a well-formed but
  wrong value shows up as an `error` result with a code instead.
- Pick a scenario chip to fill the prompt and see what is expected (calls, popups, balances);
  after the run you get PASS/FAIL per check. The evaluation is strict: any invalid call fails
  it even if a retry succeeds. The "answer mentions" checks are a keyword heuristic.
- Mock data (addresses, balances, token decimals, address format, chain id) are assumptions,
  not real Gno.land values. Scenarios that need a recipient include an address in the prompt.

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
npm run eval -- --approval reject                   # a user who rejects every signing popup
```

Results are probabilistic: read them as pass rates, not pass/fail. Run `i` uses `seed + i`, so
an invocation is repeatable against the same server build. `--reasoning off` matches the app's
default (thinking off); drop it to evaluate with thinking.

Each run uses a fresh `MockWalletSdk`. A scenario is judged on the model's tool calls, how many
signing popups were shown, and the balances afterwards (not only on what the model said). The
simulated user approves unless the scenario (or `--approval`) says to reject.

## Free chat (desktop)

To see how far the model gets with plain human language, talk to it yourself. It runs on this
Mac through llama-server (same setup as the eval); by default it is the wallet assistant: the
app's prompt and tools against a mock wallet.
It answers in the language you write in (English and Korean both work; the repo itself has no
Korean text, but you can type any language into the chat).

```bash
make chat                                        # interactive; the conversation is remembered
make chat PROMPT="Tell me my GNOT balance"        # one question, then exit
make chat ARGS="--plain"                         # the bare model: no wallet prompt, no tools
make chat ARGS="--approval approve"              # signing popups answer themselves (approve | reject)
```

In the chat: tool calls and their results are printed as `>` / `->` lines, a signing popup asks
`Approve? [y/N]` at the terminal, and a note shows when wallet balances changed. `/balances`
shows them, `/reset` forgets the conversation and resets the wallet, `/exit` quits; Ctrl-C stops
an answer in progress. A stopped or failed question is not remembered. The context is 4096
tokens, so a long chat eventually fails: `/reset`. Without a terminal (piped input), signing
popups are rejected unless `--approval approve` is given.

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
make chat   # talk to the model in your own words; PROMPT="..." asks once, ARGS="--plain" = bare model
```
