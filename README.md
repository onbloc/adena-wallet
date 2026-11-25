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
                                useLlm(llm) hook; runtime.ts, config.ts (model, context size);
                                jsonGrammar.ts (structured output without the Jinja grammar)
src/harness/                  Bounds and polices a tool-using run
  core/                         Harness: step/token/time budget, scopes, decisions. No model, no AI SDK
  mcp/                          tool sources backed by MCP servers (Onbloc), and a fake one for tests
src/agent/                    AIAgent({ llm, harness, wallet }): the assistant
  agent.ts, aiSdkBridge.ts      the entry point: one turn (history, classification, answer), a harness run as a ToolLoop
  toolRecord.ts                 the compact record of a turn's tool calls kept in the history
  requestIntent.ts              schema-constrained request classification before wallet execution
  answerGuard.ts, prompts.ts    the answer checked against what the tools returned; the system prompt
  wallet/                       the WalletSdk port, ToolName/status constants, the zod tools
src/adena/                    AdenaWalletSdk: the WalletSdk port over @adena-wallet/sdk (real wallet)
  adenaWalletSdk.ts, tokens.ts  builds the transaction, hands it to Adena to approve; token symbol -> package path
src/mock/                     Test-only code, nothing above depends on it
  wallet/                       MockWalletSdk (read-only), fixture, tokens, funding the mock from Onbloc
  app/                          Playground screen, prepared-transaction cards, Settings (MCP URL, address), benchmark log
  cli/                          make chat (chat.ts), with-server.sh
  scenario/                     scenarios, their check, the runner and the benchmark engine (portable: jest and app)
```

```ts
const llm = new LLMOnDevice();                        // or new LLMFromModel(model) on a desktop
const harness = new Harness({ toolSources: [createOnblocToolSource({ endpoint })] });
const agent = new AIAgent({ llm, harness, wallet, onTransaction });   // owns the conversation
for await (const event of agent.run({ prompt }, { account, contextTokens: 8192 })) { /* text, tool calls, done */ }
```

Dependencies point down only, and `npm run lint` enforces it: `mock` may use everything; `agent`
may use `llm/core` and `harness`, not `mock`, `adena` or `llm/device`; `adena` may use `agent` and
`harness`, not `mock` or `llm`; `llm` and `harness` never import each other, the agent, adena or
the mock; `llm/core` runs without React Native; `harness/core` does not know its plugins in
`harness/mcp`. Every module is imported through its `index.ts`.

## Conversations and context limits

`AIAgent` is the only entry point and it owns the conversation: call `agent.run({ prompt,
...generationSettings }, { account?, contextTokens?, ... })` repeatedly; callers do not assemble
`messages` or append answers. Chatting and using tools are one flow: every turn is classified, so
a question in the middle of a chat can read the wallet or prepare a transaction. `turns` exposes
the retained turns, `serialize()` saves a snapshot, `reset()` aborts the active turn and clears
the history, and `new AIAgent({ ..., session: createChatSession(saved) })` continues a saved
conversation. Concurrent turns on one agent are rejected.

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

Cancelled, incomplete and failed-lookup turns are not committed. A committed turn keeps the user
text, the answer and a **tool record**: for each tool call its name, its input and a few words on
what came of it (`prepared, unsigned and completed: 1 GNOT to g1...`, `refused (code)`, `denied
(code)`, or just the read status), so later turns know what was called and prepared. The record is
written by code and never carries raw tool output, which is untrusted data and can hold
instructions. It says that the values are past and may be stale, and that a completed action is
never repeated: remembering a transfer is not permission to prepare it again, and transaction
objects and signing authority are never restored. A prior balance answer is conversation context,
not proof of the current balance. Balance amounts are formatted by code even when NFT or other
reads succeed in the same run; those extra reads must not cause a raw base-unit model summary to
replace the formatted balances.

The app restores chats separately for each endpoint, chain and account; switching scopes
aborts the old turn. Keep the same separation when using `saved` outside the app. The app keeps
one `ChatSession` per scope and builds each run's agent with `session: history`, so loading and
saving do not create a second copy of the conversation.

## Intent-first wallet execution

Before accessing wallet tools, the agent makes a bounded, tool-free classification call. It
uses the same conversation context, a fixed system prompt, and schema-constrained JSON output.
The model returns `lookup` requirements, optional requested conceptual explanation, or an
`explanation`, `prepare`, `clarification`, or `chat` route;
the agent validates it and maps it to a typed execution policy. The classification response
itself is neither displayed as the answer nor appended to chat history.

| Classified request | Available execution | Required outcome |
| --- | --- | --- |
| Explanation or missing-detail clarification | Answer model without wallet tools or MCP discovery | Completed conversational answer |
| Balance lookup | Normalized `get_balance` operation for each classified asset requirement | Complete fresh results for every required balance |
| Other wallet lookup | Exact read-only catalog selection, then scoped model/tool execution | Every selected read succeeds; unrelated balances or model text do not complete it |
| Transaction preparation | Host opt-in, strict structured proposal, then selected action dispatch with any normalized balance prerequisite | A matching actual preparation result or a reported refusal/failure |
| Small talk, anything else, or an action the wallet cannot do | Answer model without tools; it says plainly what it cannot do | A conversational answer; nothing prepared or read |

Preparation requests, including incomplete ones, use a focused tool-free parser. Its proposal
contains the operation (`transfer` or `approve`), a supplied recipient/address alias, a symbol
or asset ID, and an exact decimal amount or explicit balance fraction. Missing details return
a clarification question without wallet discovery. No address book is supplied to the parser;
only the wallet adapter resolves the requested alias after parsing.

Malformed, truncated or unrecognized routing/proposal JSON fails with `ADENA_INTENT_INVALID`
or `ADENA_PREPARATION_INVALID` before discovery/execution; there is no repair or native-call
fallback. Caller-supplied answer instructions, tools and output schemas cannot expand this scope.
The agent dispatches only the selected wallet action through the harness. A plain-text "done"
does not prove preparation, and approval never exposes transfer as an alternative action.

Classification and proposals remain model predictions, not authorization or semantic proof.
Incorrect predictions can cause clarification or the wrong proposal. Harness scope, schema
checks, wallet validation and user review of the exact unsigned transaction remain necessary.
No signing or broadcasting is introduced.

Transaction preparation additionally requires host permission:
`agent.run(settings, { account, allowTransactionPreparation: true })`. The default is false;
classification never grants that permission. Wallet reads and preparation do not require an
unrelated MCP server to exist.

Balance requirements use provider-independent one-asset/all-assets requests. The Onbloc adapter
belongs to the agent layer; harness sources still enforce host permissions on every provider
call. `agent.getBalance(request, { account })` exposes the same structured operation without a
model. Compound lookup answers preserve every returned result, with conceptual model explanation
separate from deterministically rendered facts. Completion verifies the planned results, not
the semantic correctness of the model's plan or explanation.

The selected preparation stops at its result, including a refusal; there is no follow-up model
call that can erase a completed handoff or substitute another amount. Audit failures pause new
execution but preserve completed results and surface a separate warning.

Relative amounts use a fresh complete, unambiguous one-asset balance in the same execution run.
Code multiplies/divides bounded `bigint` base units; the model never computes the balance or
amount. A fractional base-unit remainder is refused rather than rounded. The wallet still
validates precision, supported assets, funds and its int64 limit. Fractions use the balance
snapshot, not a reservation; the signing wallet must recheck funds and fees.

Classification and preparation parsing each use one bounded model call (at most 512 output
tokens), with context pruning and the agent request deadline. Preparation parsing precedes the
execution run; the harness polices dispatch permissions, call budgets, cancellation and audit.
Balance requirements fetch/format directly. Generic reads add catalog selection and a read-only
tool loop; conceptual explanations use a tool-free answer. Preparation has no native tool-call
model loop and makes no further model call after a wallet outcome.

## Wallet layers and tool calling

```
structured proposal --> harness dispatch --> adapter (src/agent/wallet/tools.ts)  agent layer
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
the arguments it is given. Each run binds the account selected by the app, and the agent injects
it as `from`; the model never chooses it. Chat, questions and explanations work without an
account; a lookup or a preparation without one fails with `ADENA_ACCOUNT_REQUIRED` (link a wallet).
Use a separate agent (or `reset()`) when switching accounts.

```ts
const agent = new AIAgent({
  llm, harness, wallet,
  onTransaction: ({ summary, tx }) => { /* sign `tx` in the user's wallet */ },
});
agent.run({ prompt }, { account: 'g1...', contextTokens: 8192 });   // later runs retain this chat's context
```

`?` methods are optional: `approve` is executable only when the wallet implements it;
`get_approvals` is offered to read-only model execution only when the wallet lists allowances.
`onTransaction` is required whenever there is a wallet. `token` is the supplied symbol (any
case) or package path; the wallet resolves it and returns the canonical symbol.

- The preparation parser returns data, not native tool calls. The agent validates the proposal,
  obtains any normalized balance prerequisite, and dispatches exactly one selected action.
  Read-only execution can use `get_approvals()` alongside permitted remote reads. No account or
  `from` is ever a model argument.
- A prepared transaction is `{ summary, tx }`. `summary` is what the wallet resolved (type,
  chain, from, to or spender, canonical amount and token). `tx` is the wallet SDK's own object
  (for Adena an `AdenaTransaction`); it goes to `onTransaction` and **never to the model**. The
  agent renders the small preparation result directly; the model receives neither the transaction
  object nor a follow-up opportunity to change the action.
- A token approval (allowance, ERC-20 style) lets a spender use up to an amount; a new approval
  for the same spender and token replaces the old one. An allowance may exceed the balance.
  Spending an allowance (`transferFrom`) is not implemented.
- Preparation proposals are validated before dispatch, and adapter arguments are checked again
  before `execute`. Invalid proposals never reach the wallet. Wallet refusals are terminal:
  the model cannot retry with a different amount. Generic read-only tool loops remain separate.
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
Mac through llama-server. Every request is classified first, with or without an account: an
explanation or a clarification is answered without tools, while reading wallet data or preparing a
transaction needs the account, and without one the agent fails with `ADENA_ACCOUNT_REQUIRED` (link
a wallet). `--onbloc` gives the chat that account, the app's prompt and its tools. It answers in the
language you write in (English and Korean both work; the scenarios in
`src/mock/scenario/scenarios.ts` include Korean prompts, and you can type any language into the chat).

```bash
make chat                                        # interactive, no account: questions only; the conversation is remembered
make chat PROMPT="What is GNOT?"                 # one question, then exit
make chat ARGS="--onbloc"                        # with an account: wallet data and actions (below)
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
fields in Settings leaves the chat without an account: questions are still answered, and wallet
data or actions fail with `ADENA_ACCOUNT_REQUIRED`.

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
  insufficient GNOT or GNS balance).

Besides the English scenarios and their Korean twins, a **typo set** (`TYPO_SCENARIOS`, English and
Korean) feeds the model requests with mistakes. A letter missing from the verb or the token symbol
(`Snd 1 GNOT to g1...`, `Send 1 got to g1...`, `... 1 gnot 전ㅅ`, `... 1 got 소금`) is read back and
the transaction is prepared. What carries the money is never guessed, so nothing is prepared (the
model should ask) for a misspelled contact (`carl`), an address one character short, or a missing
token (`... 1 젼숑`).

Four more sets test the part before the transaction, each in English with its Korean twin:

- **Arguments** (`ARGUMENT_SCENARIOS`): how exactly the model fills in a transaction (all of a
  balance, a quarter, 20%, one and a half, the base unit `ugnot`, a capitalised contact, odd word
  order, a corrected amount) and requests that must prepare nothing (no amount, two tokens, two
  recipients, a negative or non-numeric amount, an unknown contact, finer than 6 decimals).
- **Routing** (`ROUTING_SCENARIOS`): which kind of request it is. An explanation, a how-to, a
  greeting, small talk, a swap, staking or a quoted instruction must call **no tool** and prepare
  nothing; a balance question must call `get_balance` for the right asset and the answer must
  show the amount (`10 GNOT`); a negated request or "should I send?" prepares nothing. The
  `account:` scenarios run **without a linked wallet** (`noAccount`): a question and small talk
  are still answered, while reading the balance or a transfer must raise `ADENA_ACCOUNT_REQUIRED`
  (an `error` expectation: the engine passes the run when exactly that error is raised).
- **Reads** (`READ_SCENARIOS`): which read tool answers (transactions, NFTs, token info), and no
  invented answer where no tool exists (approvals, block height). The fake history holds a memo
  that orders the model to move funds; the model must treat it as data and prepare nothing.
- **Follow-ups** (`FOLLOW_UP_SCENARIOS`, several turns): a reply that completes an unanswered
  question is read with it (`Send 1 GNOT` then `to carol`). A prepared transfer is remembered with
  its tool record, so `now send 2 to the same person`, `do it again` and `ok then send 5` after a
  refused 100 GNOT work, `What did you just prepare?` is answered without acting, and `thanks`
  prepares nothing.

These are judged on more than the summary (`checkRun`): an `answer` scenario lists the reads the
model may make (each with its exact input), fails on any other tool call, and checks that the
answer contains the values. A call the harness rejected as malformed does not count, because the
agent retries it. A follow-up replays its earlier turns in one conversation and is judged on the last
turn; the time of every turn is counted. Where a request has no single right answer (two tokens,
two recipients, the base unit) the expectation is a policy choice: the model must ask, or the
scenario says what it must prepare.

Balance routing now comes from the validated classification, not a whitelist of question
spellings. Multi-turn scenarios query all assets, discuss terminology, and ask for GNOT again.
They check fresh native balance results and absence of unintended preparation, not answer
wording. A classified balance request is dispatched directly to its required balance tools;
other classified lookups must produce actual successful read results.

A failure prints the prompt, the model's tool calls and its answer. The model is not
deterministic across builds or machines, so a failing scenario can be a model limit or a prompt
problem, not necessarily a code bug. Set `SCENARIO_URL` to use another server. The jest-expo
preset replaces `fetch` with a stub, hence the separate config.

## Benchmark in the app (on a phone)

The Chat tab has a **Benchmark** button next to Run. It runs on the loaded model and shows a live
log; when it ends, **Copy** puts the whole log (conditions, every run, the result) on the clipboard.
It stops with **Stop benchmark**; a stopped run can be copied too.

- **Empty prompt box:** the scenarios chosen in Settings (*Benchmark scenarios*: English 16, Korean 16,
  both, the 18 typo scenarios, or one of Arguments, Routing, Reads and Follow-ups) run *Benchmark
  runs* times (default 10), round by round so heat spreads over the whole run. Each Korean scenario
  is the twin of an English one and expects the same outcome. Each run is PASS or FAIL against what
  the scenario expects, and a FAIL says what the model got wrong. The extra sets are kept apart so
  *Both* stays comparable between runs.
- **Text in the prompt box:** that prompt, in any language, runs *Benchmark runs* times and the
  transactions it prepared are counted by outcome (`consistent: yes` only if every run prepared the
  same one).
- **Judged on summaries** (recipient or spender, amount, token, kind of transaction): what the model
  chose. The transaction builder is deterministic, so the same summary gives the same transaction.
  The decoded Adena message is checked only by `make scenario`, because the Adena SDK is not
  bundled into the app.
- **Fixed conditions**, so numbers compare across devices and builds: temperature 0, 512 output
  tokens, no thinking, a fresh conversation per run, a mock wallet (10 GNOT, 250 GNS, contact `carol`)
  and fake Onbloc reads in process. Settings values, the Settings address and the Onbloc and
  transaction-preparation switches do not apply. No network.
- **Report:** passes per scenario (or outcomes per prompt), errors by code (`ADENA_INTENT_INVALID`,
  ...), time per run (mean, p50, p95, max) and the first half against the second half, which
  shows thermal throttling. A development build is slower on the JavaScript side than a release
  build; the log says which one ran.
- **Time per model call:** every run line ends with the time of each model call, e.g.
  `[classify 1.9s, extract 3.2s]`, and the report adds mean, p50, p95 and output tokens per call and
  the time spent outside the model (wallet, MCP reads, JavaScript). The labels come from the
  order of the agent's structured calls (first `classify`, then `extract`; a call without an output
  schema is `answer`), not from the agent itself.
- **Why a run failed:** a FAIL that prepared nothing says what the model asked the wallet for and
  how the wallet answered (or what the model said instead), e.g. `the model asked approve({"spender":
  "g1...가",...}); the wallet refused: invalid_address`. On Mac the Korean scenarios exposed this: the
  model copies a particle written right after an address (`...주소가`) into the recipient.
- **Runtime in the header:** whether a GPU is used (and why not), the devices, the CPU features
  llama.cpp prints, the model file and the model load time. This is what tells an Android result on
  the CPU from one on a GPU. Device model, chipset, power mode and the device's temperature are not
  available to the app: write them down with the log.
- Before the first run it reads the fake Onbloc once, to fail early if that does not work in the
  phone's runtime. This works on iOS (Hermes); it has not been run on Android yet.

The engine (`src/mock/scenario/benchmark.ts`) needs only a `ScenarioRunner`, so the same code runs
against any `LLM`; `make scenario` shares the same summary check (`check.ts`).

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
- Structured output (classification, proposals) must not use llama.rn's Jinja path: for a
  reasoning model like Qwen3.5 its grammar is registered as a user grammar, so llama.cpp never
  prefills the generation prompt. The grammar then asks the model to write the assistant header
  itself and allows a free-text `<think>` block before the JSON: a 2B model fills it with long
  reasoning (~260 tokens, ~10 s on a phone) and the JSON arrives with that text in front, so the
  request fails with `ADENA_INTENT_INVALID`. `src/llm/device/jsonGrammar.ts` sends `jinja: false`
  for structured calls, which gives a plain JSON-schema grammar. It relies on the model's legacy
  chat template (ChatML for Qwen); a model whose template is not supported there fails with
  `this custom template is not supported`. The cause is in native code shared with Android, so
  Android should be affected the same way (not verified there). llama-server on the desktop does
  not show it.

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
