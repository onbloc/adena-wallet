# adena-ai

On-device LLM PoC: run a GGUF model (default: Qwen3.5-2B Q4_K_M) in React Native via
[Callstack React Native AI](https://www.react-native-ai.dev/docs/llama/getting-started)
(`@react-native-ai/llama` on top of `llama.rn`) and test generation from a playground screen.
It also checks whether the model turns plain-text wallet requests into the right tool calls:
reads through the Onbloc MCP; transfer and approve **build a transaction** and hand it to the
app. Nothing is signed or sent here: the app (the user's wallet) signs it.

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
polyfills.js                  Web APIs the AI SDK needs (imported first in index.ts)
src/llm/                      The language model
  core/                         portable, no React Native: LLM (interface), LLMFromModel (any AI SDK
                                model), generate (events, TTFT, tok/s, warnings), ToolLoop (the hook
                                an agent drives the tool loop with), index.ts
  device/                       LLMOnDevice (llama.rn): load/unload/generate, status for React;
                                useLlm(llm) hook; runtime.ts, config.ts (model, context size)
src/harness/                  Bounds and polices a tool-using run
  core/                         Harness: step/token/time budget, scopes, decisions. No model, no AI SDK
  mcp/                          tool sources backed by MCP servers (Onbloc), and a fake one for tests
src/agent/                    AIAgent({ llm, harness, wallet }): the assistant
  agent.ts, aiSdkBridge.ts      a harness run turned into a ToolLoop for llm.generate
  conversation.ts               account-bound text history, turn lifecycle, context budget and reset
  requestIntent.ts              schema-constrained request classification before wallet execution
  answerGuard.ts, prompts.ts    the answer checked against what the tools returned; the system prompt
  wallet/                       the WalletSdk port, ToolName/status constants, the zod tools
src/adena/                    AdenaWalletSdk: the WalletSdk port over @adena-wallet/sdk (real wallet)
  adenaWalletSdk.ts, tokens.ts  builds the transaction, hands it to Adena to approve; token symbol -> package path
src/mock/                     Test-only code, nothing above depends on it
  wallet/                       MockWalletSdk (read-only), fixture, tokens, funding the mock from Onbloc
  app/                          Playground screen, prepared-transaction cards, Settings (MCP URL, address)
  cli/                          make chat (chat.ts), with-server.sh
```

```ts
const llm = new LLMOnDevice();                        // or new LLMFromModel(model) on a desktop
const harness = new Harness({ toolSources: [createOnblocToolSource({ endpoint })] });
const agent = new AIAgent({ llm, harness, wallet, onTransaction });
const conversation = agent.createConversation({ account, contextTokens: 8192 });
for await (const event of conversation.run({ prompt })) { /* text, tool calls, done */ }
```

Dependencies point down only, and `npm run lint` enforces it: `mock` may use everything; `agent`
may use `llm/core` and `harness`, not `mock`, `adena` or `llm/device`; `adena` may use `agent` and
`harness`, not `mock` or `llm`; `llm` and `harness` never import each other, the agent, adena or
the mock; `llm/core` runs without React Native; `harness/core` does not know its plugins in
`harness/mcp`. Every module is imported through its `index.ts`.

## Conversations and context limits

`agent.createConversation({ account?, contextTokens?, saved? })` owns the history of one chat.
Call `conversation.run({ prompt, ...generationSettings })` repeatedly; callers no longer need
to assemble `messages` or append answers. `turns` exposes retained text turns, `serialize()`
saves a version-1 snapshot, and `reset()` aborts the active turn and clears history. Concurrent
turns on the same conversation are rejected. `agent.run` remains the lower-level, stateless
single-run API for explicit messages and isolated integrations.

The conversation defaults to the model's context window (8192 for the default model).
`contextTokens` can be set lower, never above that window. Each model step reserves room for
system instructions, tool schemas, the current question and live tool results, plus the output
budget. Counts use the existing conservative byte-based estimate, not an exact tokenizer.
When the input does not fit, the oldest complete user/answer pairs are removed from both the
model input and retained session history. Recent turns stay verbatim; no LLM summarization is
performed. The snapshot also retains the existing maximum of 50 completed turns.

The current question is never truncated. If it cannot fit even without history, the request
fails with `ADENA_CONTEXT_LIMIT`; shorten the question or start a larger supported context.
If the current tool exchange outgrows the budget, the run also fails rather than cutting tool
arguments or results. Removed turns are forgotten by subsequent requests.

Only requests classified as explanations or clarification questions can keep a tool-free model
answer. They carry a warning that no wallet lookup was performed; this is not verified wallet
data. A lookup or preparation request cannot be reinterpreted as an explanation merely because
the model did not call a tool. Missing required results are explicit failures, not remembered
answers. The guard does not semantically verify every statement in free-form explanation text.

Cancelled, incomplete and failed-lookup turns are not committed. Persisted chat is text only:
tool calls, transaction objects and signing authority are never restored or replayed. A prior
balance answer is conversation context, not proof of the current balance. Balance amounts are
formatted by code even when NFT or other reads succeed in the same run; those extra reads must
not cause a raw base-unit model summary to replace the formatted balances.

The app restores chats separately for each endpoint, chain and account; switching scopes
aborts the old turn. Keep the same separation when using `saved` outside the app. Existing app
storage uses an injected `ChatSession` through `createConversation({ account, session })`,
so loading and saving do not create a second copy of the conversation.

## Intent-first wallet execution

Before accessing wallet tools, the agent makes a bounded, tool-free classification call. It
uses the same conversation context, a fixed system prompt, and schema-constrained JSON output.
The model returns a route such as `explanation`, `native_balance`, `transfer`, or `approve`;
the agent validates it and maps it to a typed execution policy. The classification response
itself is neither displayed as the answer nor appended to chat history.

| Classified request | Available execution | Required outcome |
| --- | --- | --- |
| Explanation or missing-detail clarification | Answer model without wallet tools or MCP discovery | Completed conversational answer |
| Native/token/portfolio balance lookup | Direct read-only calls for the classified balance target | Valid fresh results for every required balance tool |
| Other wallet lookup | Read-only model/tool loop | A successful current lookup; model text alone is not enough |
| Transfer or approval | Only the selected preparation action, plus reads | A matching actual preparation result or a reported refusal/failure |
| Unsupported request | Fixed wallet-scope refusal | No wallet execution |

An approval request never exposes `transfer` as a substitute. A plain-text "done" cannot satisfy
a preparation request. Malformed, truncated or unrecognized classification output fails with
`ADENA_INTENT_INVALID` before wallet discovery/execution; it is not repaired or treated as an
explanation. Caller-supplied answer instructions, tools and output schemas do not override the
classifier or expand the selected execution scope.

Classification is still a model prediction, not authorization or a guarantee of semantic
accuracy. Incorrect routes can cause unnecessary clarification or an inappropriate answer.
Harness scope, schema checks, wallet validation and user review of unsigned transactions remain
necessary. No signing or broadcasting is introduced.

The classifier consumes an additional bounded model call. Balance routes then fetch and format
their results directly, without another answer-model call. Explanation and preparation routes
continue with a separate answer/tool phase. Context pruning applies to both phases and removed
history is not reintroduced between them. Local llama-server is configured to accept structured
output schemas; the existing native provider also supports that response format.

## Wallet layers and tool calling

```
model --tool call--> adapter (src/agent/wallet/tools.ts)  agent layer
                       |  injects the user's address as `from`, maps wallet refusals to results,
                       |  turns contact names into addresses, hands each transaction to onTransaction
                       v  WalletSdk methods only: no key ever crosses this line
                     WalletSdk (src/agent/wallet/port.ts)   implemented over a wallet SDK (the mock: src/mock/wallet; Adena: src/adena)
                       getContacts?() -> [{ alias, address }]
                       transfer({from,to,amount,token}) -> { summary, tx }   (builds; signs and sends nothing)
                       approve?({from,spender,amount,token}) -> { summary, tx }
                       getAllowances?(owner) -> [{ spender, token, amount }]
```

There is no account in the wallet or in the agent: each wallet method builds a transaction from
the arguments it is given. A conversation binds the account selected by the app, and the agent
injects it as `from`; the model never chooses it. Create a separate conversation when switching
accounts.

```ts
const agent = new AIAgent({
  llm, harness, wallet,
  onTransaction: ({ summary, tx }) => { /* sign `tx` in the user's wallet */ },
});
const conversation = agent.createConversation({ account: 'g1...', contextTokens: 8192 });
conversation.run({ prompt });                       // subsequent calls retain this chat's context
```

A run keeps the account it started with. The low-level `agent.run(settings, { account })` API
still accepts an explicit conversation, but the CLI and app use the managed conversation API.

`?` methods are optional: the model is offered `approve` and `get_approvals` only if the wallet
implements them. `onTransaction` is required whenever there is a wallet. `token` is the symbol
the user or model wrote (any case) or a package path; the wallet resolves it and answers with
the canonical symbol.

- The model sees `transfer({to,amount,token})`, `approve({spender,amount,token})` and
  `get_approvals()` (only if the wallet lists allowances), next to the Onbloc read tools
  (balances, tokens, transactions). There are no balance tools here: balances have one source,
  Onbloc. No account or `from` is ever a model argument.
- A prepared transaction is `{ summary, tx }`. `summary` is what the wallet resolved (type,
  chain, from, to or spender, canonical amount and token). `tx` is the wallet SDK's own object
  (for Adena an `AdenaTransaction`); it goes to `onTransaction` and **never to the model**. The
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

A read-only fixture: it checks the arguments like a wallet would (address, amount, token,
balance for a transfer) and returns a summary with a copy of it as `tx`. It signs nothing and its
balances never change. It starts from the account's Onbloc balances; an address with no entry
has zero. It has no `getAllowances`, so `get_approvals` is not offered. Token decimals, address
format and chain id are assumptions, not real Gno.land values.

### The Adena wallet (`src/adena`)

`new AdenaWalletSdk({ tokens, chainId? })` builds Adena transactions from its arguments. It has
no account and no connection to a wallet. `tokens` resolves a token and its owner's balance in
base units (`ResolvedToken.balance: bigint`). `createOnblocTokenResolver` reads
`get_native_balance` for GNOT and `get_token_balances` for GRC20 tokens on each resolution.

- `transfer` builds a bank `MsgSend` (GNOT, in `ugnot`) or a GRC20 `Transfer` realm call;
  `approve` builds a GRC20 `Approve` call (none for GNOT). The model never chooses the realm,
  function or arguments: they come from the resolved token and the checked address and amount.
  `tx` is an unsigned `TransactionBuilder.build()` result: pass it to `adenaSDK.signTransaction`.
- Amounts are exact base units (`bigint`), at most int64.
- `transfer` refuses an amount above the sender's resolved balance with `insufficient_balance`;
  no transaction is built. Amounts equal to the balance are allowed. Fees are **not** included
  in this check, so a full-balance transfer can still lack funds for gas. `approve` may exceed
  the token balance because an allowance does not transfer tokens.
- The balance is a snapshot, not a reservation. The signing wallet must recheck funds and fees
  before signing or broadcasting; other transactions may have changed the available balance.
- No `getAllowances` (nothing here can list an owner's allowances), so `get_approvals` is not
  offered; no contacts.
- A token must be among the sender's holdings; a symbol shared by several is refused with their
  package paths.
- Jest: the SDK's dependencies need `uuid`, `@noble/*` and `@scure/*` transformed, and
  `@web3auth/no-modal` is stubbed (`package.json` `jest`; `src/adena/testing`), like the SDK's
  own tests.
- **Not bundled into the app yet.** Metro cannot bundle `@adena-wallet/sdk` as is: its entry pulls
  `@web3auth/no-modal` (-> `@metamask/connect-multichain` needs a native `async-storage`) and
  Node built-ins (`crypto`, `events`, `buffer`, `url`). A probe bundle (702 modules) built with
  `@web3auth/no-modal` and the Node built-ins replaced by empty modules in `metro.config.js`; it
  has not run on Hermes. Add that config when the adapter is wired into the app.

## Free chat (desktop)

To see how far the model gets with plain human language, talk to it yourself. It runs on this
Mac through llama-server; by default it is a plain chat with no wallet. `--onbloc` adds the
wallet: the app's prompt and tools. It answers in the language you write in (English and
Korean both work; the repo itself has no Korean text, but you can type any language into the chat).

```bash
make chat                                        # interactive plain chat; the conversation is remembered
make chat PROMPT="Tell me a joke"                # one question, then exit
make chat ARGS="--onbloc"                        # with the wallet (below)
make chat ARGS="--context-tokens 4096"           # lower the chat's context budget
```

In the chat: tool calls and their results are printed as `>` / `->` lines, and a prepared
transaction as `[transaction prepared, not signed]` with its fields. `/balances` shows the mock
balances, `/reset` forgets the conversation and resets the wallet, `/exit` quits; Ctrl-C stops
an answer in progress. A stopped or failed question is not remembered. The context defaults to
8192 tokens; older completed turns are automatically discarded when needed. `--context-tokens`
sets a smaller budget; `/reset` explicitly forgets the chat. An oversized current question is
rejected rather than truncated.

### The wallet: Onbloc reads, mock transactions

`make chat ARGS="--onbloc"` and the app's Settings tab (MCP URL and My address, both editable)
read from the Onbloc api-v3 MCP: balances, tokens and transactions come from mainnet.
`transfer` and `approve` build a transaction with the mock wallet and show it (the app as a card:
"Not signed. Sign it in your wallet."). The mock wallet starts with the address's real GNOT and
GNS balances (read once when the wallet is created); `/reset` and the app's Reset wallet read
them again. Defaults are the dev endpoint and account in `src/mock/app/onblocSettings.ts`; for
the CLI, `EXPO_PUBLIC_ONBLOC_MCP_URL` / `EXPO_PUBLIC_ONBLOC_ACCOUNT` override them. Clearing both
fields in Settings gives a plain chat without the wallet.

## Scenario tests (real model)

`npm test` scripts the model, so it checks the wiring, not what the model does with a human
sentence. `make scenario` (jest, `jest.scenario.config.js`, `src/mock/scenario/*.scenario.ts`)
runs the real agent against llama-server at temperature 0, once per scenario: the Onbloc reads
are a fixed fake (10 GNOT, 250 GNS). Both the agent and `createOnblocTokenResolver` read that
same fake MCP; the wallet is `AdenaWalletSdk` with one contact (`carol`).
Each scenario in `scenarios.ts` is a plain-language prompt and what it must produce:

- a transfer or an approval: the prepared transaction's summary **and** its decoded Adena
  message (`MsgSend` in ugnot, or a GRC20 `Transfer` / `Approve` call with the exact base-unit
  args) must match, the sender is the account, and nothing is signed;
- or no transaction at all (missing recipient, unknown token, GNOT approval, zero amount,
  insufficient balance).

Balance routing now comes from the validated classification, not a whitelist of question
spellings. Multi-turn scenarios query all assets, discuss terminology, and ask for GNOT again.
They check fresh native balance results and absence of unintended preparation, not answer
wording. A classified balance request is dispatched directly to its required balance tools;
other classified lookups must produce actual successful read results.

A failure prints the prompt, the model's tool calls and its answer. The model is not
deterministic across builds or machines, so a failing scenario can be a model limit or a prompt
problem, not necessarily a code bug. Set `SCENARIO_URL` to use another server. The jest-expo
preset replaces `fetch` with a stub, hence the separate config.

## Metrics

- **TTFT**: start of classification -> first visible answer or tool event for wallet requests.
- **tok/s**: decode speed for single-stage generation. Omitted for classified wallet requests
  because their multiple model phases do not have one comparable decode interval. Their total
  time and output-token count include classification.
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
npm run typecheck
npm run lint
npm run scenario   # needs a running llama-server (make scenario starts one)
npm test
```

Shortcuts (`make help`):

```bash
make init   # npm install; installs bun and llama.cpp via brew if missing
make test   # typecheck + lint + jest (mock model, no LLM)
make scenario # plain-language requests -> transactions, against the local model (slow; not in make test)
make chat   # talk to the local model; PROMPT="..." asks once, ARGS="--onbloc" adds the wallet
make build  # Release build only: make build ios|android
make deploy # Release build + install on a connected phone: make deploy ios|android
```
