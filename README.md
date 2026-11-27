# adena-ai

An injectable wallet assistant for browser and Node applications, with an on-device React Native
playground. `AIAgent` reads through a bounded harness and prepares unsigned transactions through
the host's `WalletSdk` implementation. It never signs, broadcasts, or handles private keys.

The mock app and CLI are testbeds; neither is part of the library package.

## Stack

Library: TypeScript, AI SDK v7, Zod v4, MCP. Browser builds target ES2022; Node requires 22+.
The optional native playground uses Expo SDK 58 / React Native 0.88 and llama.rn.

## Use as a library

TypeScript **5.5+** consumers are supported with `skipLibCheck: true`.
TypeScript 4.9 cannot parse the current AI SDK/Zod declarations even with that
setting. Checking all upstream declarations instead also requires satisfying their compiler and
ambient Node/JSON Schema type requirements; that is not covered by the 5.5 compatibility check.
The package provides ESM, CommonJS, and declarations for `node`, `bundler`, and `NodeNext`
module resolution. The repository builds with TypeScript 6.0.

```bash
npm install
npm run build
npm pack --pack-destination /tmp
# In the consuming project:
npm install /tmp/adena-ai-llm-poc-1.0.0.tgz
```

The package remains private; packing does not publish it. Only `dist`, the README, and package
metadata are shipped. Browser consumers do not install Expo, React, React Native, llama, or any
wallet SDK.

| Import | Public API |
| --- | --- |
| `adena-ai-llm-poc` | `AIAgent`, wallet contracts, generation settings/events |
| `adena-ai-llm-poc/llm` | `LLM`, `LLMFromModel`, generation utilities |
| `adena-ai-llm-poc/llm/remote` | `createLLMRemote`, provider options |
| `adena-ai-llm-poc/harness` | `Harness`, budgets and tool-source contracts |
| `adena-ai-llm-poc/harness/onbloc` | Onbloc mainnet reader/tool source |
| `adena-ai-llm-poc/llm/device` | Optional native `LLMOnDevice`, `createLLM`, React hook |

```ts
import { AIAgent } from 'adena-ai-llm-poc';
import { createLLMRemote } from 'adena-ai-llm-poc/llm/remote';
import { Harness } from 'adena-ai-llm-poc/harness';
import { createOnblocToolSource } from 'adena-ai-llm-poc/harness/onbloc';

// apiKey/model/baseURL/contextTokens and the wallet adapter come from the host.
const llm = createLLMRemote({
  provider: 'openai-compatible', apiKey, model, baseURL, contextTokens,
});
const harness = new Harness({ toolSources: [createOnblocToolSource({ endpoint })] });
const agent = new AIAgent({
  llm, harness, wallet, onTransaction,
  budget: { maxSteps: 5, timeoutMs: 60_000 },
});
for await (const event of agent.run({ prompt }, { account, signal })) {
  console.log(event);
}
```

Implement `WalletSdk` in the consuming app and use `onTransaction` to present an unsigned draft
for approval. Neither the library nor its mock testbeds require a concrete wallet SDK or wallet
application. `tx` is an opaque host-defined payload, not a required SDK transaction type.
API keys, provider/browser CORS, approved endpoints, and account/network selection remain the
host's responsibility. Keep application-owned provider secrets on a backend, not in a
distributed extension.

The native subpath requires the optional peers `@react-native-ai/llama`, `llama.rn`, `react`,
and `react-native`. It is the only entry that exports `createLLM()`; browser code uses
`createLLMRemote()` instead. Native hosts provide the missing Web APIs before loading the
library; the playground demonstrates this in `src/mock/app/polyfills.js`.


## Run

llama.rn is a native module, so **Expo Go does not work**. A dev build is required
(Xcode for iOS, Android SDK for Android).

```bash
npm install
npm run ios       # native playground; generates src/mock/app/ios/ and builds
npm run android   # native playground; generates src/mock/app/android/ and builds
```

`npm start` starts that playground's Metro server. `npm run native:prebuild` generates its native
projects without launching them; it is separate from `npm run build`, which builds the library.

First launch: tap **Load**. The model (~1.4 GB) is downloaded from Hugging Face once,
then loaded from local storage (works offline afterwards).

### Release builds for a phone

Connect the phone to install (iOS: unlocked, USB, trusted, Developer Mode on, a Team set in
Xcode under Signing & Capabilities; Android: USB debugging on), then:

```bash
make build ios        # Release build only; prints the .app path (no phone needed)
make build android    # Release build only; prints the .apk path
make deploy ios       # build, sign missing frameworks, install and launch
make deploy android   # build via expo run:android and install through adb
DEVICE=<id> make deploy ios   # pick a phone when several are connected (UDID / adb serial)
```

A Release build carries its JS, so any code change needs a new `make build` / `make deploy`.
A free Apple account signs for 7 days; after that, deploy again. On the first iOS install,
trust the developer in Settings > General > VPN & Device Management.

## Structure

Three libraries, each with one main class, and the test-only code on top of them:

```
src/index.ts                  Browser-safe library entry (no app registration or global polyfills)
src/llm/                      The language model
  core/                         portable, no React Native: LLM (interface), LLMFromModel (any AI SDK
                                model), generate (events, TTFT, tok/s, warnings), ToolLoop (the hook
                                an agent drives the tool loop with), index.ts
  remote/                       createLLMRemote({ provider, apiKey, model, baseURL? }): Anthropic, OpenAI
                                (Responses API, Codex) or any OpenAI-compatible server. No React Native
  device/                       LLMOnDevice (llama.rn): load/unload/generate, status for React;
                                useLlm(llm) hook; runtime.ts, config.ts (model, context size)
    createLlm.ts                native-only createLLM(remote?): on-device or hosted
src/harness/                  Bounds and polices a tool-using run
  core/                         Harness: step/token/time budget, scopes, decisions. No model, no AI SDK
  mcp/                          tool sources backed by MCP servers (Onbloc), and a fake one for tests
src/agent/                    AIAgent({ llm, harness, wallet }): the assistant
  agent.ts, aiSdkBridge.ts      a harness run turned into a ToolLoop for llm.generate
  answerGuard.ts, prompts.ts    the answer checked against what the tools returned; the system prompt
  wallet/                       the WalletSdk port, ToolName/status constants, the zod tools
src/mock/                     Test-only code, nothing above depends on it
  wallet/                       MockWalletSdk (read-only), fixture, tokens, funding the mock from Onbloc
  app/                          separate Expo project: entry, polyfills, config, playground and Settings
  cli/                          make chat (chat.ts), with-server.sh
```

Browser consumers use `llm/remote` or supply an AI SDK model to `LLMFromModel`. Native consumers
import `createLLM` from `llm/device` and call `load()` before running an on-device model.

Dependencies point down only, and `npm run lint` enforces it: `mock` may use everything;
`agent` may use `llm/core` and `harness`, not `mock` or `llm/device`; `llm` and `harness`
never import each other, the agent, or the mock. `llm/core` and `llm/remote` run without
React Native; `harness/core` does not know its plugins in `harness/mcp`. Modules are imported
through their `index.ts`.

## Wallet layers and tool calling

```
model --tool call--> adapter (src/agent/wallet/tools.ts)  agent layer
                       |  injects the user's address as `from`, maps wallet refusals to results,
                       |  turns contact names into addresses, hands each transaction to onTransaction
                       v  WalletSdk methods only: no key ever crosses this line
                     WalletSdk (src/agent/wallet/port.ts)   implemented by the host (testbed: src/mock/wallet)
                       getContacts?(options?) -> [{ alias, address }]
                       transfer({from,to,amount,token}, options?) -> { summary, tx }
                       approve?({from,spender,amount,token}, options?) -> { summary, tx }
                       getAllowances?(owner, options?) -> [{ spender, token, amount }]
```

There is no account in the wallet or in the agent: each wallet method builds a transaction from
the arguments it is given, and the user's address is an argument of each `run`. A wallet app holds
many accounts and the user switches between them, so the app passes the one to act for every time.
The agent reads its holdings and injects it as `from`; the model never chooses it.

```ts
const agent = new AIAgent({
  llm, harness, wallet,
  onTransaction: ({ summary, tx }, { signal }) => approvalQueue.enqueue({ summary, tx, signal }),
});
agent.run({ prompt }, { account: 'g1...' });          // the account for this run
```

A run keeps the account it started with. The conversation (`messages`) is the app's, and it holds
what the model read for earlier accounts: start a new conversation when the account changes.

### Cancellation and limits

Wallet methods may accept `WalletOperationOptions` with the run's `AbortSignal`; the transaction
callback receives the same options as its second argument. Cancellation is checked before wallet
work and after each awaited preparation, so a late result cannot open a new approval flow.
An already-invoked callback cannot be retracted. Honor its signal while doing asynchronous work
inside the callback, and revalidate account/network/session state before signing.

The signal aborts on caller cancellation, deadline, and run close, including successful completion.
An approval draft already accepted by the host needs its own UI lifecycle; normal run completion
is not a user rejection. Setup cancellation rejects with the abort reason (normally `AbortError`);
generation-time cancellation emits `done` with `aborted: true` and no conversation messages.
Independent LLM consumers can supply both caller and loop signals; either cancels generation.

`AIAgentOptions.budget` overrides wallet-backed run limits:

| Field | Default | Scope |
| --- | --- | --- |
| `maxSteps` | 5 | Model calls; takes precedence over `settings.maxSteps` |
| `maxToolCalls` | 4 | Harness reads only, not wallet preparations |
| `maxTokens` | Twice `llm.contextTokens` | Total model input/output token budget |
| `timeoutMs` | 300000 | Discovery, contact setup and generation |

Limits must be positive safe integers; timer limits must also fit the platform timer range.
`settings.maxOutputTokens` defaults to 512 but larger values are honored when the context and
remaining budget permit. Set `contextTokens` to the actual model limit, especially for small
OpenAI-compatible servers; remote's 128k default is not model discovery. The context estimate
remains conservative, not a provider tokenizer. Without a wallet, the agent is a direct LLM
wrapper and does not apply these agent budgets.


With a wallet, ordinary conversation and clarification questions do not require a tool call and
are retained in the conversation. The prompt instructs the model to look up current wallet data;
this is not a guarantee against unsupported claims. Failed tool calls still replace the answer
and are not retained.

`?` methods are optional: the model is offered `approve` and `get_approvals` only if the wallet
implements them. `onTransaction` is required whenever there is a wallet. `token` is the symbol
the user or model wrote (any case) or a package path; the wallet resolves it and answers with
the canonical symbol.

- The model sees `transfer({to,amount,token})`, `approve({spender,amount,token})` and
  `get_approvals()` (only if the wallet lists allowances), next to the Onbloc read tools
  (balances, tokens, transactions). There are no balance tools here: balances have one source,
  Onbloc. No account or `from` is ever a model argument.
- A prepared transaction is `{ summary, tx }`. `summary` is what the wallet resolved (type,
  chain, from, to or spender, canonical amount and token). `tx` is an opaque host-owned object;
  it goes to `onTransaction` and **never to the model**. The
  model gets `{status: 'prepared', from, to|spender, amount, token, message}` and is told to say
  the transaction is ready to sign, never that it was sent.
- A token approval (allowance, ERC-20 style) lets a spender use up to an amount; a new approval
  for the same spender and token replaces the old one. An allowance may exceed the balance.
  Spending an allowance (`transferFrom`) is not implemented.
- Tool arguments are validated with zod before `execute`. A call that fails validation (wrong
  type, unknown tool, unparsable JSON) is shown as **[INVALID]** and never reaches the wallet;
  the SDK feeds the error back to the model, which may retry.
- Value checks (address, amount > 0, token, balance) live in the wallet, so a well-formed but
  wrong value shows up as an `error` result with a code instead. If `onTransaction` throws, the
  tool call fails.

### The mock wallet (`src/mock/wallet`)

A read-only fixture: it checks addresses, amounts, tokens and transfer balances, then returns
`{ summary, tx }` as plain JSON-serializable objects. `tx` is a separate copy of the summary,
not an SDK instance or encoded blockchain transaction. There is no signing or broadcasting.
Balances never change. Onbloc only provides the initial balance snapshot; an address with no
entry has zero. The mock has no `getAllowances`, so `get_approvals` is not offered. Token
decimals, address format and chain id are testbed assumptions.

### Host wallet integration

The consuming wallet implements `WalletSdk` over its existing token metadata, message builders,
address book, and allowance support. Methods validate addresses, amounts, decimals, supported
tokens and applicable balances, then return an unsigned draft. Keep exact amounts as strings or
base-unit integers; enforce the target chain's numeric limits in that adapter.

`onTransaction` hands that draft to the host's existing approval/fee/document flow. Preserve
software, hardware-wallet and session-account signing checks; calling a signing service directly
must not bypass those policies. The host decides which funding address the run acts for and
retains any separate signing-account identity.

Onbloc's built-in source supports **Gno mainnet only**. A different `chainId` does not turn it
into another network's reader: enable the feature only on mainnet, or supply matching tools and
wallet implementation. Recreate the agent when its configured chain changes and start a fresh
conversation when the account or network changes.

The MCP adapter and its client use an interpreter-based JSON Schema validator, preserving
input/output validation without `eval` or `new Function`. This supports MV3 extension CSP;
the host still controls network permissions and whether local HTTP endpoints are allowed.


## Free chat (desktop)

To see how far the model gets with plain human language, talk to it yourself. It runs on this
Mac through llama-server; by default it is a plain chat with no wallet. `--onbloc` adds the
wallet: the app's prompt and tools. It answers in the language you write in (English and
Korean both work; the repo itself has no Korean text, but you can type any language into the chat).

```bash
make chat                                        # interactive plain chat; the conversation is remembered
make chat PROMPT="Tell me a joke"                # one question, then exit
make chat ARGS="--onbloc"                        # with the wallet (below)
```

In the chat: tool calls and their results are printed as `>` / `->` lines, and a prepared
transaction as `[transaction prepared, not signed]` with its fields. `/balances` shows the mock
balances, `/reset` forgets the conversation and resets the wallet, `/exit` quits; Ctrl-C stops
an answer in progress. A stopped or failed question is not remembered. The context is 8192
tokens, so a very long chat eventually fails: `/reset`.

### The wallet: Onbloc reads, mock transactions

`make chat ARGS="--onbloc"` and the app's Settings tab (MCP URL and My address, both editable)
read from the Onbloc api-v3 MCP: balances, tokens and transactions come from mainnet.
`transfer` and `approve` build a transaction with the mock wallet and show it (the app as a card:
"Not signed. Sign it in your wallet."). The mock wallet starts with the address's real GNOT and
GNS balances (read once when the wallet is created); `/reset` and the app's Reset wallet read
them again. Defaults are the dev endpoint and account in `src/mock/app/onblocSettings.ts`; for
the CLI, `EXPO_PUBLIC_ONBLOC_MCP_URL` / `EXPO_PUBLIC_ONBLOC_ACCOUNT` override them. Clearing both
fields in Settings gives a plain chat without the wallet.

## Metrics

- **TTFT**: start -> first text or reasoning delta.
- **tok/s**: decode speed, `(outputTokens - 1) / (end - first delta)`. Shown
  as `-` when the provider reports no usage.
- Provider warnings (e.g. unsupported options) are shown under the output.
- Memory / thermal are not measured in-app; use Xcode Instruments or Android Studio Profiler.

## Notes

- Qwen3.5 thinks by default, which adds latency; the **Thinking** switch is off by default
  (`reasoning: 'none'`).
- `n_ctx` is 8192 (library default 2048). Max output tokens is capped below it. The desktop
  llama-server (`-c` in `src/mock/cli/with-server.sh`, `SERVER_CONTEXT_TOKENS` in
  `src/mock/cli/lib/server.ts`) must use the same value to match the phone. Change the model or
  context size in `src/llm/device/config.ts`.

## Scripts

```bash
npm run build
npm run typecheck
npm run lint
npm test
```

Shortcuts (`make help`):

```bash
make init   # npm install; installs bun and llama.cpp via brew if missing
make test   # typecheck + lint + jest (mock model, no LLM)
make chat   # talk to the local model; PROMPT="..." asks once, ARGS="--onbloc" adds the wallet
make build  # Release build only: make build ios|android
make deploy # Release build + install on a connected phone: make deploy ios|android
```
