# adena-ai

An injectable wallet assistant for browser and Node applications, with an on-device React Native
playground. `AIAgent` reads through a bounded harness and prepares unsigned transactions through
the host's `WalletSdk` implementation. It never signs, broadcasts, or handles private keys.

The mock app and CLI are testbeds; neither is part of the library package.

## Stack

Library: TypeScript, AI SDK v7, Zod v4, MCP. Browser builds target ES2022; Node requires 22.12+.
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
# In the consuming project (`ai` and `zod` are peers: their types appear in the public API, so the app supplies one shared copy):
npm install /tmp/adena-ai-llm-poc-1.0.0.tgz ai zod
```

The package remains private; packing does not publish it. Only `dist`, the README, and package
metadata are shipped. Browser consumers do not install Expo, React, React Native, llama, or any
wallet SDK.

| Import | Public API |
| --- | --- |
| `adena-ai-llm-poc` | `AIAgent`, wallet contracts, generation settings/events |
| `adena-ai-llm-poc/llm` | `LLM`, `LLMFromModel`, generation utilities |
| `adena-ai-llm-poc/llm/remote` | `createLLMRemote`, hosted OpenAI options, the model catalog |
| `adena-ai-llm-poc/harness` | `Harness`, budgets and tool-source contracts |
| `adena-ai-llm-poc/harness/onbloc` | Chain-bound Onbloc reader/tool source |
| `adena-ai-llm-poc/llm/device` | Optional native `LLMOnDevice`, `createLLM`, React hook |

```ts
import { AIAgent } from 'adena-ai-llm-poc';
import { createLLMRemote } from 'adena-ai-llm-poc/llm/remote';
import { Harness } from 'adena-ai-llm-poc/harness';
import { createOnblocToolSource } from 'adena-ai-llm-poc/harness/onbloc';

// The endpoint-chain pair, key, context limit and wallet come from trusted host configuration.
const llm = createLLMRemote({ apiKey, contextTokens });
const harness = new Harness({ toolSources: [createOnblocToolSource({ endpoint, chainId })] });
const agent = new AIAgent({
  llm, harness, chainId, wallet, onTransaction,
  budget: { maxSteps: 5, timeoutMs: 60_000 },
});
for await (const event of agent.run({ prompt }, { account, signal, allowTransactionPreparation })) {
  console.log(event);
}
```

Implement `WalletSdk` in the consuming app and use `onTransaction` to present an unsigned draft
for approval. Neither the library nor its mock testbeds require a concrete wallet SDK or wallet
application. `tx` is an opaque host-defined payload, not a required SDK transaction type.
API keys, provider/browser CORS, approved endpoints, and account/network selection remain the
host's responsibility. Keep application-owned provider secrets on a backend, not in a
distributed extension.

The native subpath requires optional peers `@react-native-ai/llama`, `llama.rn`, `react`,
`react-native`, and `react-native-blob-util`. It is the only entry that exports `createLLM()`; browser code uses
`createLLMRemote()` instead. Native hosts provide the missing Web APIs before loading the
library; the playground demonstrates this in `src/mock/app/polyfills.js`.

Choose where the model runs with `createLLM({ kind })`; the agent only receives the result:

```ts
import { createLLM } from 'adena-ai-llm-poc/llm/device';

const llm = settings.kind === 'local'
  ? createLLM({ kind: 'local' })                        // LLMOnDevice: await llm.load() first
  : createLLM({ kind: 'remote', apiKey, fetch: expoFetch });
const agent = new AIAgent({ llm, harness, wallet, onTransaction, session });
```

Every `LLM` reports `kind`: `local` runs on the device, `remote` sends prompts, including wallet
data, to a server. `LLMFromModel` defaults to `remote`; pass `{ kind: 'local' }` for a model known
to run on the device. An agent keeps its `llm` for life: to switch, build a new `AIAgent` with
`session: agent.session`. Pending clarifications are not carried over.

### Hosted models

`createLLMRemote({ apiKey, model })` runs any model of `src/llm/remote/openaiModels.json`; `model`
defaults to `gpt-6-luna` (`DEFAULT_REMOTE_MODEL`). A model ID, alias (`gpt-5.6`) or dated snapshot
(`gpt-5.4-2026-03-05`) is accepted. `OPENAI_MODELS` lists the catalog, e.g. for a model picker.

```ts
const llm = createLLMRemote({ apiKey, model: 'gpt-6.1-terra' });
```

The catalog holds the text models: names, status (`deprecated` models carry their shutdown date),
access (`restricted` ones need an approved organization), context window, output limit,
reasoning efforts and features. `unsupported` lists the models that cannot run the agent and why,
and `excluded` the rest of OpenAI's catalog (image, audio, embedding, moderation, shut down). The agent
streams, constrains classification with a JSON schema and calls tools, so a model needs all three:
`gpt-5.5-pro`, `o3-pro` (no streaming), `gpt-5.4-pro` and `gpt-5.2-pro` (no structured outputs) are
refused with that reason, as is any ID the catalog does not list. A new OpenAI model works after
it is added to the file; the sources and retrieval date are in its header.

Each model is called with what it accepts. The API answers 400 to an unsupported reasoning effort
or sampling parameter, so the call is fitted to the catalog entry:

- `reasoning: 'none'` becomes the lowest effort of a model that cannot turn reasoning off
  (`gpt-6.2-*`, `gpt-6-astra`, `gpt-6.1-sol`, `gpt-5`, ...). Unset or `provider-default` sends no effort.
- Temperature and top-p are sent only while the model does not reason (effort `none`, or no
  reasoning model at all). `gpt-4o`, `gpt-4.1` and `chat-latest` take no effort.
- `maxOutputTokens` above the model's output limit throws `RangeError` before any request.
- `contextTokens` defaults to the model window capped at 128,000 and may be raised to the window
  (`RangeError` above it).

Efforts for `gpt-6-cyber` and `gpt-5.6-cyber` are not published; the file lists the subset
every documented reasoning family accepts.


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

Model files are cached by the full Hugging Face model ID, not just the filename. Different
repositories may safely use the same filename. Downloads stream to a temporary native file;
only a successful download is published as a cached model. The former filename-only cache
cannot establish a file's repository, so it is not reused or deleted automatically: upgrading
from that cache requires one new download. Delete file removes only the selected model's new cache.

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
  remote/                       createLLMRemote({ apiKey, model }): hosted OpenAI models (Responses API), any model of
                                openaiModels.json (default `gpt-6-luna`), fitted to its efforts and limits. No React Native
  device/                       LLMOnDevice (llama.rn): load/unload/generate, status for React;
                                useLlm(llm) hook; runtime.ts, modelStorage.ts (namespaced native file cache),
                                config.ts (model, context size); jsonGrammar.ts (structured output without the Jinja grammar)
    createLlm.ts                native-only createLLM({ kind: 'local' | 'remote', ... })
src/harness/                  Bounds and polices a tool-using run
  core/                         Harness: step/token/time budget, scopes, decisions. No model, no AI SDK
  mcp/                          tool sources backed by MCP servers (Onbloc), and a fake one for tests
src/agent/                    AIAgent({ llm, harness, wallet }): the assistant
  agent.ts, aiSdkBridge.ts      the entry point: one turn (history, classification, answer), a harness run as a ToolLoop
  toolRecord.ts                 the compact record of a turn's tool calls kept in the history
  requestIntent.ts              schema-constrained request classification before wallet execution
  answerGuard.ts, prompts.ts    the answer checked against what the tools returned; the system prompt
  wallet/                       the WalletSdk port, ToolName/status constants, the zod tools
src/mock/                     Test-only code, nothing above depends on it
  wallet/                       MockWalletSdk (read-only), fixture, tokens, funding the mock from Onbloc
  app/                          separate Expo project with entry/config, scoped chat persistence,
                                model/settings/transcript components and benchmark log
  cli/                          make chat (chat.ts), with-server.sh
  scenario/                     scenarios, their check, the runner and the benchmark engine (portable: jest and app)
```

Browser consumers use `llm/remote` or supply an AI SDK model to `LLMFromModel`. Native consumers
import `createLLM` from `llm/device` and call `load()` before running an on-device model.

Dependencies point down only, and `npm run lint` enforces it: `mock` may use everything;
`agent` may use `llm/core` and `harness`, not `mock` or `llm/device`; `llm` and `harness`
never import each other, the agent, or the mock. `llm/core` and `llm/remote` run without
React Native; `harness/core` does not know its plugins in `harness/mcp`. Modules are imported
through their `index.ts`.

## Conversations and context limits

`AIAgent` is the only entry point and it owns the conversation: call `agent.run({ prompt,
...generationSettings }, { account?, contextTokens?, ... })` repeatedly; callers do not assemble
`messages` or append answers. Chatting and using tools are one flow: every turn is classified, so
a question in the middle of a chat can read the wallet or prepare a transaction. `turns` exposes
the retained turns, `serialize()` saves a snapshot, `reset()` aborts the active turn and clears
the history, and `new AIAgent({ ..., session: createChatSession(saved) })` continues a saved
conversation. Concurrent turns on one agent are rejected with `AGENT_TURN_ACTIVE`; a turn whose
generator was abandoned instead of drained frees the agent once its deadline has passed.
A turn stopped by `budget.timeoutMs` ends with `aborted: true` and a timeout warning, which tells
it apart from a cancellation. Failures of the agent itself are `AgentError`s: branch on `error.code`
(`AGENT_TURN_ACTIVE`, `AGENT_ACCOUNT_REQUIRED`, `AGENT_PROMPT_LIMIT`, `AGENT_CONTEXT_LIMIT`, ...), not
on the message. Fixed replies follow the user's language (Korean when the text has Hangul).

Reuse the same agent while its model, wallet and scope are unchanged. `clearPending()` aborts an
active turn and forgets volatile clarification, token-choice and balance-reference state without
erasing visible history. Use it when backgrounding or invalidating a pending choice; `reset()`
also clears the stored conversation. Serialized text never restores permission to select or prepare.

The conversation defaults to the model's context window (8192 for the default model).
`contextTokens` can be set lower, never above that window. Each model step reserves room for
system instructions, tool schemas, the current question and live tool results, plus the output
budget. Counts use the existing conservative byte-based estimate, not an exact tokenizer.
When the input does not fit, the oldest complete user/answer pairs are removed from both the
model input and retained session history. Recent turns stay verbatim; no LLM summarization is
performed. The snapshot also retains the existing maximum of 50 completed turns.

The current question is never truncated. If it cannot fit even without history, the request
fails with `AGENT_CONTEXT_LIMIT`; shorten the question or start a larger supported context.
If the current tool exchange outgrows the budget, the run also fails rather than cutting tool
arguments or results. Removed turns are forgotten by subsequent requests.

Independent of the model's context window, a prompt may contain at most 16,384 UTF-16 code
units; a larger prompt fails with `AGENT_PROMPT_LIMIT` before classification or discovery.
Snapshots retain answers up to 32,768 code units and compact tool records up to 2,048.
A completed answer that cannot fit those storage bounds is still shown in full, with an explicit
warning that this exchange was not retained. Earlier retained turns are not replaced by it.

Only requests classified as explanations or clarification questions can keep a tool-free model
answer. They carry a warning that no wallet lookup was performed; this is not verified wallet
data. A lookup or preparation request cannot be reinterpreted as an explanation merely because
the model did not call a tool. Missing required results are explicit failures, not remembered
answers. The guard does not semantically verify every statement in free-form explanation text.

A corrected read retry can satisfy a previously failed attempt. Unresolved failed pages,
pending calls, partial results and security mismatches still prevent completion. When a lookup
also requests an explanation, that explanation must end normally: truncated, interrupted or
missing-terminal explanations preserve fetched facts but do not commit the incomplete turn.

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
replace the formatted balances. The user sees raw read results, but the remembered answer replaces
each with `<tool> result omitted from history.`, so untrusted tool data is never replayed to the model.

The app restores chats separately for each endpoint, chain and account; switching scopes
aborts the old turn and clears pending choices. Keep the same separation when using `saved`
outside the app. It keeps one `ChatSession` per scope and reuses its agent while the model and
wallet match. Each transaction callback stays bound to its originating turn and scope.

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

Malformed, truncated or unrecognized routing/proposal JSON fails with `AGENT_INTENT_INVALID`
or `AGENT_PREPARATION_INVALID` before discovery/execution; there is no repair or native-call
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

For read-only balance and account-history requests, a public address explicitly supplied in the
question is the lookup target; otherwise the active account is used. Results identify the address
queried. If the request names multiple possible addresses, the agent asks which one to use rather
than choosing one. Looking up another address does not change the active account: transfers and
approvals are prepared only from that account and still require host permission and wallet review.

The selected preparation stops at its result, including a refusal; there is no follow-up model
call that can erase a completed handoff or substitute another amount. Audit failures pause new
execution but preserve completed results and surface a separate warning.
Waiting for an asynchronous audit callback is bounded by the run's cancellation and deadline.
If that wait is interrupted, the completed decision is returned with `auditFailed` rather than
being lost behind a pending audit; new execution remains blocked.

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
                     WalletSdk (src/agent/wallet/port.ts)   implemented by the host (testbed: src/mock/wallet)
                       getContacts?(options?) -> [{ alias, address }]
                       transfer({from,to,amount,token}, options?) -> { summary, tx }
                       approve?({from,spender,amount,token}, options?) -> { summary, tx }
                       getAllowances?(owner, options?) -> [{ spender, token, amount }]
```

There is no account in the wallet or in the agent: each wallet method builds a transaction from
the arguments it is given. Each run binds the account selected by the app, and the agent injects
it as `from`; the model never chooses it. Chat, questions and explanations work without an
account; a lookup or a preparation without one fails with `AGENT_ACCOUNT_REQUIRED` (link a wallet).
Use a separate agent (or `reset()`) when switching accounts.

When a symbol resolves to several tokens, the host may throw
`new WalletError(WalletErrorCode.AmbiguousToken, message, candidateIds)` with their exact realm IDs.
The agent shows those choices without preparing a draft. Only the next exact candidate-ID reply
can continue the unresolved operation; it keeps the original amount and resolved recipient.
Bare confirmations, unrelated or read-only turns, cancellation, scope changes, `clearPending()`
and restoration from a snapshot do not grant that authority. Fractional selections read the chosen
asset's balance afresh. A successful GRC20 summary should include `packagePath`; the host must use
that same identity and its own verified decimals when building the opaque `tx`.

```ts
const agent = new AIAgent({
  llm, harness, wallet,
  onTransaction: ({ summary, tx }, { signal }) => approvalQueue.enqueue({ summary, tx, signal }),
});
for await (const event of agent.run({ prompt }, { account, contextTokens: 8192, allowTransactionPreparation })) {
  console.log(event); // Later runs retain this agent's completed conversation.
}
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
  chain, from, to or spender, canonical amount and token). `tx` is an opaque host-owned payload;
  it goes to `onTransaction` and **never to the model**. The
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

### Cancellation and execution limits

Wallet methods may accept `WalletOperationOptions`; the transaction callback receives the
effective run signal as its second argument. Caller cancellation, deadline and run close stop
new wallet work and discard late preparations before the callback. Already-invoked callbacks
cannot be retracted, so asynchronous callback work must honor the signal.

Normal run close also aborts that signal. An approval draft already accepted by the host needs
its own UI lifetime; successful agent completion is not a user rejection. The host must recheck
the selected account, network and signing policy before approving a saved draft.

`AIAgentOptions.budget` preserves the following defaults:

| Field | Default | Scope |
| --- | --- | --- |
| `maxSteps` | 5 | Harness model-execution steps |
| `maxToolCalls` | 4 | Harness read and preparation dispatches |
| `maxTokens` | Twice the model context | Harness execution token budget |
| `timeoutMs` | 300000 | The complete classified request |

Classification, proposal parsing, catalog selection and conceptual answer calls have separate
context/output bounds; they do not consume the harness execution-stage counters. They share
the request cancellation/deadline. Limits are positive safe integers and timer values must fit
the platform timer range. Requested lookup-loop output reserves above 512 are honored when
the context and token budget permit. `contextTokens` must match the actual model/server limit.


### The mock wallet (`src/mock/wallet`)

A read-only fixture: it checks addresses, amounts, tokens and transfer balances, then returns
`{ summary, tx }` as plain JSON-serializable objects. The testbed payload contains `chainId`,
unsigned `messages` and an empty `signatures` array, not an SDK instance or protobuf encoding.
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

Onbloc supports **Gno mainnet (`gnoland-1`) and Onyx testnet (`onyx-1`)** through host-configured
endpoint-chain pairs. `OnblocMcpConfig.chainId` defaults to `gnoland-1`; an explicit value must
contain 1–128 characters without whitespace. A source exposes tools only for its configured
chain, labels results with that chain, and rejects structured responses whose `network` differs.
The host must verify the endpoint serves that chain: changing `chainId` does not switch the
server's backend, and responses without `network` cannot independently establish its identity.

Multiple networks can share one harness without colliding on tool names:

```ts
const harness = new Harness({
  toolSources: [
    createOnblocToolSource({ endpoint: mainnetEndpoint, chainId: 'gnoland-1' }),
    createOnblocToolSource({ endpoint: onyxEndpoint, chainId: 'onyx-1' }),
  ],
});
const agent = new AIAgent({ llm, harness, chainId: 'onyx-1', wallet, onTransaction });
```

Only the selected chain's source is discovered for each run. Supply a matching wallet
implementation, recreate the agent when its chain changes, and isolate conversations and
pending choices by endpoint, chain and account. The playground already uses those scope keys;
its mock transfer/approval summaries and unsigned payloads use the selected chain.

The MCP adapter and its client use an interpreter-based JSON Schema validator, preserving
input/output validation without `eval` or `new Function`. This supports MV3 extension CSP;
the host still controls network permissions and whether local HTTP endpoints are allowed.

## Free chat (desktop)

To see how far the model gets with plain human language, talk to it yourself. It runs on this
Mac through llama-server. Every request is classified first, with or without an account: an
explanation or a clarification is answered without tools, while reading wallet data or preparing a
transaction needs the account, and without one the agent fails with `AGENT_ACCOUNT_REQUIRED` (link
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

`make chat ARGS="--onbloc"` and the app's Settings tab (MCP URL, Chain ID and My address)
read from the configured Onbloc MCP. Mainnet remains the default; to use Onyx, pair
`onyx-1` with its actual MCP endpoint. No testnet URL is inferred or bundled.
`transfer` and `approve` build a transaction with the mock wallet and show it (the app as a card:
"Not signed. Sign it in your wallet."). The mock wallet starts with the address's real GNOT and
GNS balances (read once when the wallet is created); `/reset` and the app's Reset wallet read
them again. Defaults are the mainnet endpoint and account in `src/mock/app/onblocSettings.ts`.
For the CLI, `EXPO_PUBLIC_ONBLOC_MCP_URL`, `EXPO_PUBLIC_ONBLOC_ACCOUNT` and
`EXPO_PUBLIC_ONBLOC_CHAIN_ID` override the endpoint, account and chain respectively.
A non-mainnet chain requires an explicitly configured MCP URL:

```sh
EXPO_PUBLIC_ONBLOC_CHAIN_ID=onyx-1 \
EXPO_PUBLIC_ONBLOC_MCP_URL="$ONYX_MCP_URL" \
make chat ARGS="--onbloc"
```

Set `ONYX_MCP_URL` to the approved Onyx MCP endpoint before running this command.
Clearing both endpoint and address in Settings leaves the chat without an account:
questions are still answered, and wallet data or actions fail with `AGENT_ACCOUNT_REQUIRED`.

## Scenario tests (real model)

`npm test` scripts the model, so it checks the wiring, not what the model does with a human
sentence. `make scenario` (jest, `jest.scenario.config.js`, `src/mock/scenario/*.scenario.ts`)
runs the real agent against llama-server at temperature 0, once per scenario: the Onbloc reads
are a fixed fake (10 GNOT, 250 GNS). The agent reads that fake MCP; the wallet is the SDK-free
`MockWalletSdk` with matching fixture balances and one contact (`carol`).
Each scenario in `scenarios.ts` is a plain-language prompt and what it must produce:

- a transfer or an approval: the prepared transaction's summary **and** its plain unsigned
  message (`MsgSend` in ugnot, or a GRC20 `Transfer` / `Approve` call with the exact base-unit
  args) must match, the sender is the account, and nothing is signed;
- or no transaction at all (missing recipient, unknown token, GNOT approval, zero amount,
  insufficient GNOT or GNS balance).

Besides the English scenarios and their Korean twins, a **typo set** (`TYPO_SCENARIOS`, English and
Korean) checks the initial request, an explicit correction and a bare `yes` / `네`.
Clear verb typos may produce the exact requested draft or a clarification. Asset misspellings
(`got`, `gsn`), contact misspellings (`carl`), incomplete addresses and missing assets require
clarification; they are never silently replaced. A bare confirmation does not authorize a new draft.

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
  are still answered, while reading the balance or a transfer must raise `AGENT_ACCOUNT_REQUIRED`
  (an `error` expectation: the engine passes the run when exactly that error is raised).
- **Reads** (`READ_SCENARIOS`): which read tool answers (transactions, NFTs, token info), and no
  invented answer where no tool exists (approvals, block height). The fake history holds a memo
  that orders the model to move funds; the model must treat it as data and prepare nothing.
- **Follow-ups** (`FOLLOW_UP_SCENARIOS`, several turns): an explicit missing-field reply may complete
  an unanswered request (`Send 1 GNOT` then `to carol`). A verified balance lookup may ground a
  relative amount. Completed or refused transactions do not authorize implicit target or asset reuse:
  `do it again`, `now send 2 to the same person` and `ok then send 5` require a restatement.
  Questions about prior preparation are answered without acting, and `thanks` prepares nothing.

These are judged on more than the summary (`checkRun`): an `answer` scenario lists the reads the
model may make (each with its exact input), fails on any other tool call, and checks that the
answer contains the values. A call the harness rejected as malformed does not count, because the
agent retries it. A follow-up replays its earlier turns in one conversation and is judged on the last
turn; the time of every turn is counted. Where a request has no single right answer (two tokens,
two recipients, the base unit) the expectation is a policy choice: the model must ask, or the
scenario says what it must prepare.

**Asked, never guessed.** After the model parses a transfer or an approval, code checks it against
the user's own words, and a doubt becomes a question instead of a transaction:

- the **amount** must be losslessly supported by the user's digits, unambiguous number words
  (`one and a half`, `한 개 반`) or an explicit share of a verified balance. Unsupported wording
  or an amount invented by the model requires clarification; the `ugnot` scenario does not infer
  a GNOT display amount;
- the **token** must be the exact symbol or identifier the user supplied. A typo is not authority
  to choose a known token; `tokenSymbols` helps detect ambiguous or misspelled proposals without
  silently correcting them;
- more than one **token** (`1 GNOT and 2 GNS`) or more than one **recipient** (a contact and an
  address, two contacts) in the latest message is asked about, so one of them is not silently dropped.
  The address book is read only after parsing for this check; the model never sees it;
- Korean particles are removed from a complete address; invalid checksums are rejected, never repaired.

A read that cannot be matched to a tool the model chose (`AI_ToolChoiceViolationError`) no longer
fails the run: the answer says the lookup could not be verified.

Balance routing now comes from the validated classification, not a whitelist of question
spellings. Multi-turn scenarios query all assets, discuss terminology, and ask for GNOT again.
They check fresh native balance results and absence of unintended preparation, not answer
wording. A classified balance request is dispatched directly to its required balance tools;
other classified lookups must produce actual successful read results.

A failure prints the prompt, the model's tool calls and its answer. The model is not
deterministic across builds or machines, so a failing scenario can be a model limit or a prompt
problem, not necessarily a code bug. Set `SCENARIO_URL` to use another server. The jest-expo
preset replaces `fetch` with a stub, hence the separate config.

### Hosted model (OpenAI)

The same scenarios run on the hosted OpenAI model (`gpt-6-luna`, the default of `src/llm/remote/config.ts`)
with `make scenario-remote`; the local run (`make scenario`) is unchanged and ignores these variables.
Hosted runs are billed by OpenAI.

| Variable | |
| --- | --- |
| `OPENAI_API_KEY` | the API key, required |
| `SCENARIO_CONTEXT_TOKENS` | optional context window; default 128000 |

```bash
OPENAI_API_KEY=... make scenario-remote
```

Keys come from the environment only, never from the repo; `.env` is git-ignored, but jest does not
read it, so export the variable. Do not put a key in an `EXPO_PUBLIC_*` variable: those are
bundled into the app. The test title names the target (`[openai:gpt-6-luna]`). The context window
is far above the local 8192, so the agent's token budgets differ from a local run.

In the app, Settings > *Model* switches between the on-device model and OpenAI (API key only; the
model and endpoint are fixed). The key is kept in memory only (re-enter it after a restart), is sent
only to OpenAI, and is not written to the benchmark log. Requests stream through `expo/fetch`.

Supported root-object output schemas retain OpenAI's strict structured-output format. Root
unions (`oneOf` / `anyOf`) use JSON mode because OpenAI rejects those roots; their schema is
included in the model instructions, and the returned JSON must still pass client-side validation.
That fallback does not provide provider-enforced schema conformance.

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
- **Repeat:** the hard tool-calling cases (token info, an instruction hidden in tool output, a
  chain fact no tool gives, and three follow-ups) run *Benchmark runs* times each (try 30-100) at
  **temperature 0.7**: at temperature 0 repeats mostly give the same answer, which says little
  about how often the model is right. The log header says so. A stopped Repeat run is still
  balanced round by round.
- **Text in the prompt box:** that prompt, in any language, runs *Benchmark runs* times and the
  transactions it prepared are counted by outcome (`consistent: yes` only if every run prepared the
  same one).
- **Judged on summaries** (recipient or spender, amount, token, kind of transaction): what the model
  chose. Both CLI scenarios and the app benchmark use SDK-free unsigned mock drafts.
  `make scenario` additionally checks the actual draft message's destination, integer amount
  and token path; this does not validate protobuf encoding or perform real signing.
- **Fixed conditions**, so numbers compare across devices and builds: temperature 0, 512 output
  tokens, no thinking, a fresh conversation per run, a mock wallet (10 GNOT, 250 GNS, contact `carol`)
  and fake Onbloc reads in process. Settings values, the Settings address and the Onbloc and
  transaction-preparation switches do not apply. Wallet and MCP reads use no network; a hosted LLM
  still calls its model provider.
- **Report:** passes per scenario (or outcomes per prompt), errors by code (`AGENT_INTENT_INVALID`,
  ...), time per run (mean, p50, p95, max) and the first half against the second half, which
  shows thermal throttling. A development build is slower on the JavaScript side than a release
  build; the log says which one ran.
- **Tool calling and intervals:** `tool choice` checks the expected calls and disallows unrelated
  calls; transfer and approval scenarios allow a balance read. Scenarios that only specify no
  transaction do not specify tool calls and are excluded. `arguments (right tool only)` checks
  specified read inputs or the prepared transaction summary; unavailable comparisons are excluded.
  Rates show a 95% Wilson interval, as do scenarios run at least 20 times. Interpreting these
  intervals requires independent, identically distributed runs; repeated model outputs may be correlated.
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
- The configured `n_ctx` defaults to 8192; only the final runtime fallback is 2048. Output tokens must fit below it. The desktop
  llama-server (`-c` in `src/mock/cli/with-server.sh`, `SERVER_CONTEXT_TOKENS` in
  `src/mock/cli/lib/server.ts`) must use the same value to match the phone. Change the model or
  context size in `src/llm/device/config.ts`.
- Device load, unload and file removal execute in request order. An equivalent model and
  effective context configuration reuses the ready model; changing the configuration reloads it.
  During `unloading`, model access is unavailable and active generations are cancelled before
  native completion draining and release. Playground model controls are blocked during chat,
  benchmarks, preparation and lifecycle transitions.
- Caller and tool-loop cancellation signals are combined: either can stop generation, including
  before the first provider call. A loop cannot replace or disable the caller's cancellation.
- Structured output (classification, proposals) must not use llama.rn's Jinja path: for a
  reasoning model like Qwen3.5 its grammar is registered as a user grammar, so llama.cpp never
  prefills the generation prompt. The grammar then asks the model to write the assistant header
  itself and allows a free-text `<think>` block before the JSON: a 2B model fills it with long
  reasoning (~260 tokens, ~10 s on a phone) and the JSON arrives with that text in front, so the
  request fails with `AGENT_INTENT_INVALID`. `src/llm/device/jsonGrammar.ts` sends `jinja: false`
  for structured calls, which gives a plain JSON-schema grammar. It relies on the model's legacy
  chat template (ChatML for Qwen); a model whose template is not supported there fails with
  `this custom template is not supported`. The cause is in native code shared with Android, so
  Android should be affected the same way (not verified there). llama-server on the desktop does
  not show it.

## Scripts

```bash
npm run build
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
make scenario-remote # the same scenarios on the hosted OpenAI model (costs money): needs OPENAI_API_KEY
make chat   # talk to the local model; PROMPT="..." asks once, ARGS="--onbloc" adds the wallet
make build  # Release build only: make build ios|android
make deploy # Release build + install on a connected phone: make deploy ios|android
```
