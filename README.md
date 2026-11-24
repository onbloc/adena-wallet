# adena-ai

On-device LLM PoC: run a GGUF model (default: Qwen3.5-2B Q4_K_M) in React Native via
[Callstack React Native AI](https://www.react-native-ai.dev/docs/llama/getting-started)
(`@react-native-ai/llama` on top of `llama.rn`) and test generation from a playground screen.
It also checks whether the model turns plain-text wallet requests into the right tool calls:
reads through the Onbloc MCP, transfer and approve against a **mock wallet**.

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
  answerGuard.ts, prompts.ts    the answer checked against what the tools returned; the system prompt
  wallet/                       the WalletSdk port, ToolName/status constants, the zod tools
src/mock/                     Test-only code, nothing above depends on it
  wallet/                       MockWalletSdk, fixture, tokens, amounts, funding the mock from Onbloc
  app/                          Playground screen, signing modal, Settings (MCP URL, address)
  cli/                          make chat (chat.ts), with-server.sh
```

```ts
const llm = new LLMOnDevice();                        // or new LLMFromModel(model) on a desktop
const harness = new Harness({ toolSources: [createOnblocToolSource({ endpoint })] });
const agent = new AIAgent({ llm, harness, wallet });  // without a wallet it is the LLM alone
for await (const event of agent.run({ prompt })) { /* text, tool calls, done */ }
```

Dependencies point down only, and `npm run lint` enforces it: `mock` may use everything; `agent`
may use `llm/core` and `harness`, not `mock` or `llm/device`; `llm` and `harness` never import
each other, the agent or the mock; `llm/core` runs without React Native; `harness/core` does not
know its plugins in `harness/mcp`. Every module is imported through its `index.ts`.

## Wallet layers and tool calling

```
model --tool call--> adapter (src/agent/wallet/tools.ts)  agent layer
                       |  injects the user's address, maps wallet refusals to results,
                       |  turns contact names into addresses, passes a transfer's message on to be signed
                       v  WalletSdk methods only: no key ever crosses this line
                     WalletSdk (src/agent/wallet/port.ts)   implemented by the wallet app (the mock: src/mock/wallet)
                       getActiveAddress() -> address        getContacts?() -> [{ alias, address }]
                       transfer({from,to,amount,token}) -> message (moves nothing)
                       sign(message) -> asks the user (popup) -> signed | rejected
                       approve?({from,spender,amount,token}) -> message (stores nothing)
                       getAllowances?(owner) -> [{ spender, token, amount }]
```

`?` methods are optional: the model is offered `approve` and `get_approvals` only if the wallet
implements them. A wallet app that wants an assistant implements `WalletSdk` over its own SDK and
passes it to `AIAgent`.

- The model sees `transfer({to,amount,token})`, `approve({spender,amount,token})`,
  `get_approvals()` and `sign_message({message})`, next to the Onbloc read tools (balances,
  tokens, transactions). There are no balance tools here: balances have one source, Onbloc. No
  account or `from` is ever a model argument: the harness injects the user's own account.
- Token approvals (allowances, ERC-20 style) are kept in memory per owner, spender and token:
  `approve` lets a spender use up to an amount and a new approval for the same spender and
  token **replaces** the old one; `get_approvals` lists them, oldest first. Like `transfer`,
  `approve` builds a message that the harness passes to `sdk.sign`; nothing is stored unless
  the user approves the popup. An allowance may exceed the balance. Spending an allowance
  (`transferFrom`) is not implemented. "Approval" in `ApprovalRecord` / `ApprovalPolicy` means
  the signing popup, not an allowance.
- After `transfer`, **the harness** (not the model) passes the wallet-created message to
  `sdk.sign`. The popup shows exactly that message. Funds move only when the user approves
  (signed); on reject nothing moves. The model gets a small `{status: signed | rejected}`.
- The SDK only signs messages it created itself (altered or invented messages are refused
  without asking the user), re-checks the balance at signing time, and applies a message once.
- The private key (a stand-in secret in the mock) never appears in any result, error, popup
  request or log; tests check this.
- In the app, the signing popup is a modal (Approve / Reject). In tests and `--approval
  approve|reject` a simulated user answers: `autoApproval(ApprovalPolicy.Approve | Reject)`.
- Tool arguments are validated with zod before `execute`. A call that fails validation (wrong
  type, unknown tool, unparsable JSON) is shown as **[INVALID]** and never reaches the wallet;
  the SDK feeds the error back to the model, which may retry.
- Value checks (address, amount > 0, balance) live in the SDK, so a well-formed but wrong
  value shows up as an `error` result with a code instead. An address is lowercased first, then
  checked for its length and its `g1` prefix only (no character set, no checksum), so the same
  address in any case is one wallet entry. One that is not 40 characters long gets the message
  `The address length is not valid. Please check it again.`; one of the right length that does
  not start with `g1` gets a generic invalid-address message.
- Mock data (token decimals, address format, chain id) are assumptions, not real Gno.land
  values. The mock wallet starts from the account's Onbloc balances; any other address starts
  at zero and gets what is sent to it.
- In the app, runs keep using one wallet, so a transfer shows up in later runs. **Reset
  wallet** (Settings) starts over. The Settings tab shows the wallet as it is now: the balances
  of the account and of every address that received something, plus the approvals the user has
  given. It updates as soon as a transfer or approval is signed, even while the run is still
  going.

## Free chat (desktop)

To see how far the model gets with plain human language, talk to it yourself. It runs on this
Mac through llama-server; by default it is a plain chat with no wallet. `--onbloc` adds the
wallet: the app's prompt and tools. It answers in the language you write in (English and
Korean both work; the repo itself has no Korean text, but you can type any language into the chat).

```bash
make chat                                        # interactive plain chat; the conversation is remembered
make chat PROMPT="Tell me a joke"                # one question, then exit
make chat ARGS="--onbloc"                        # with the wallet (below)
make chat ARGS="--onbloc --approval approve"     # signing popups answer themselves (approve | reject)
```

In the chat: tool calls and their results are printed as `>` / `->` lines, a signing popup asks
`Approve? [y/N]` at the terminal, and a note shows when wallet balances changed. `/balances`
shows them, `/reset` forgets the conversation and resets the wallet, `/exit` quits; Ctrl-C stops
an answer in progress. A stopped or failed question is not remembered. The context is 8192
tokens, so a very long chat eventually fails: `/reset`. Without a terminal (piped input), signing
popups are rejected unless `--approval approve` is given.

### The wallet: Onbloc reads, mock actions

`make chat ARGS="--onbloc"` and the app's Settings tab (MCP URL and My address, both editable)
read from the Onbloc api-v3 MCP: balances, tokens and transactions come from mainnet.
`transfer`, `approve`, `get_approvals` and `sign_message` run on a mock wallet, behind the
signing popup. The mock wallet starts with the address's real GNOT and GNS balances (read once
when the wallet is created) and then drifts from the chain: a mock transfer changes the mock
balances only. `/reset` and the app's Reset wallet read the balances again. Defaults are the dev
endpoint and account in `src/mock/app/onblocSettings.ts`; for the CLI, `EXPO_PUBLIC_ONBLOC_MCP_URL` /
`EXPO_PUBLIC_ONBLOC_ACCOUNT` override them. Clearing both fields in Settings gives a plain chat
without the wallet.

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
