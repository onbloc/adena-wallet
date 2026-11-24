/// <reference types="node" />
// Talk to the model in your own words, to see how far it gets. The model runs
// on this Mac via llama-server. By default it is a plain chat; --onbloc adds
// read-only Onbloc tools, with mock transaction preparation available by explicit opt-in.
//
//   make chat                                   interactive
//   make chat PROMPT="Tell me a joke"            one question, then exit
//   make chat ARGS="--onbloc"                    with the wallet
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

import type { LanguageModel } from 'ai';

import { AIAgent, formatBalance, type AgentConversation, type ConversationSettings, type PreparedTransaction } from '../../agent';
import { DEFAULT_BUDGET, Harness } from '../../harness/core';
import { createOnblocToolSource, gnoPublicAddress, type OnblocMcpConfig } from '../../harness/mcp';
import {
  DEFAULT_GENERATE_SETTINGS,
  GenerateEventType,
  LLMFromModel,
} from '../../llm/core';
import { describeTransaction } from '../app/describeTransaction';
import { DEFAULT_ONBLOC_ACCOUNT, DEFAULT_ONBLOC_MCP_URL } from '../app/onblocSettings';
import { FIXTURE } from '../wallet/fixture';
import type { MockWalletSdk } from '../wallet/mockWalletSdk';
import type { Balances } from '../wallet/tokens';
import { createOnblocMockWallet } from '../wallet/onblocWallet';
import { boundedNumber, parseChatArgs } from './lib/cli';
import { connectModel, DEFAULT_MODEL_NAME, DEFAULT_SERVER_URL, SERVER_CONTEXT_TOKENS } from './lib/server';

const USAGE = `Usage: bun src/mock/cli/chat.ts [options]
  --prompt TEXT      ask once and exit instead of chatting
  --onbloc           add Onbloc reads (default MCP URL and address; override with
                     EXPO_PUBLIC_ONBLOC_MCP_URL / EXPO_PUBLIC_ONBLOC_ACCOUNT)
  --allow-transaction-preparation
                     allow mock transfer/approve preparation with --onbloc; never signs or sends
  --url URL          OpenAI-compatible base URL (default ${DEFAULT_SERVER_URL})
  --model NAME       model name sent to the server (default ${DEFAULT_MODEL_NAME})
  --temperature T    (default ${DEFAULT_GENERATE_SETTINGS.temperature})
  --max-tokens N     per model call (default ${DEFAULT_GENERATE_SETTINGS.maxOutputTokens})
  --context-tokens N conversation limit (default ${SERVER_CONTEXT_TOKENS}; max ${SERVER_CONTEXT_TOKENS})
  --system-file P    use this file as the system prompt

In the chat: /reset (forget the conversation, reset the wallet)  /balances  /help  /exit`;

type Options = {
  prompt?: string;
  url: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextTokens: number;
  system?: string;
  onbloc?: OnblocMcpConfig & { account: string };
  allowTransactionPreparation: boolean;
};

function parseOptions(argv: string[]): Options {
  const { values, flags, allowTransactionPreparation } = parseChatArgs(argv);
  const systemFile = values.get('system-file');
  let onbloc: Options['onbloc'];
  if (flags.has('onbloc')) {
    // Env overrides the app's Settings defaults.
    const endpoint = process.env.EXPO_PUBLIC_ONBLOC_MCP_URL?.trim() || DEFAULT_ONBLOC_MCP_URL;
    const account = process.env.EXPO_PUBLIC_ONBLOC_ACCOUNT?.trim() || DEFAULT_ONBLOC_ACCOUNT;
    if (!endpoint || !gnoPublicAddress.safeParse(account).success) {
      throw new Error('Set EXPO_PUBLIC_ONBLOC_MCP_URL and a valid public EXPO_PUBLIC_ONBLOC_ACCOUNT.');
    }
    onbloc = { endpoint, account: gnoPublicAddress.parse(account) };
  }

  return {
    prompt: values.get('prompt'),
    onbloc,
    allowTransactionPreparation,
    url: values.get('url') ?? DEFAULT_SERVER_URL,
    model: values.get('model') ?? DEFAULT_MODEL_NAME,
    temperature: boundedNumber(values, 'temperature', DEFAULT_GENERATE_SETTINGS.temperature, 0, 2, false),
    maxTokens: boundedNumber(values, 'max-tokens', DEFAULT_GENERATE_SETTINGS.maxOutputTokens, 1, 4095),
    contextTokens: boundedNumber(values, 'context-tokens', SERVER_CONTEXT_TOKENS, 1, SERVER_CONTEXT_TOKENS),
    system: systemFile ? readFileSync(systemFile, 'utf8') : undefined,
  };
}

const dim = (text: string) => (process.stdout.isTTY ? `\x1b[2m${text}\x1b[0m` : text);
const json = (value: unknown) => JSON.stringify(value) ?? 'undefined';

const formatBalances = (balances: Balances) =>
  Object.entries(balances)
    .map(([token, amount]) => `${amount} ${token}`)
    .join(', ');

function printBalances(balances: Record<string, Balances>, you: string | undefined) {
  for (const [address, held] of Object.entries(balances)) {
    const label =
      address === you ? 'My address (you)' : (FIXTURE.contacts.find((c) => c.address === address)?.alias ?? address);
    console.log(`  ${label}: ${formatBalances(held)}`);
  }
}

/** The conversation so far and, with --onbloc, the agent and its mock wallet. */
type Session = { agent?: AIAgent; sdk?: MockWalletSdk; chat: AgentConversation };

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const model: LanguageModel = await connectModel(options.url, options.model);

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  // Lines go through a queue: with piped input, all of them arrive (and the
  // input closes) while an answer is still being written.
  const queued: string[] = [];
  let waiting: ((line: string | null) => void) | null = null;
  let inputEnded = false;
  rl.on('line', (line) => {
    if (waiting) {
      const resolve = waiting;
      waiting = null;
      resolve(line);
    } else {
      queued.push(line);
    }
  });
  rl.on('close', () => {
    inputEnded = true;
    waiting?.(null);
    waiting = null;
  });
  /** The next line the user types; null once the input is over. */
  const ask = (prompt: string): Promise<string | null> => {
    if (!inputEnded) {
      rl.setPrompt(prompt);
      rl.prompt();
    }
    const next = queued.shift();
    if (next !== undefined) return Promise.resolve(next);
    if (inputEnded) return Promise.resolve(null);
    return new Promise((resolve) => {
      waiting = resolve;
    });
  };

  const you = options.onbloc?.account;

  /** Prepared, never signed: the user signs in their own wallet. */
  const printTransaction = ({ summary }: PreparedTransaction) => {
    const { title, rows } = describeTransaction(summary);
    console.log(`  [transaction prepared, not signed] ${title}`);
    for (const [label, value] of rows) console.log(`    ${label}: ${value}`);
  };

  // Read-only runs need no mock wallet or upfront balance fetch.
  const llm = new LLMFromModel(model, { contextTokens: SERVER_CONTEXT_TOKENS });
  const newSession = async (): Promise<Session> => {
    if (!options.onbloc) {
      const agent = new AIAgent({ llm, harness: new Harness() });
      return { chat: agent.createConversation({ contextTokens: options.contextTokens }) };
    }
    let sdk: MockWalletSdk | undefined;
    if (options.allowTransactionPreparation) {
      console.error('loading balances from Onbloc...');
      sdk = await createOnblocMockWallet({ onbloc: options.onbloc });
    }
    const harness = new Harness({
      toolSources: [createOnblocToolSource(options.onbloc)],
      budget: { ...DEFAULT_BUDGET, maxTokens: 2 * llm.contextTokens, timeoutMs: 5 * 60_000 },
    });
    const agent = sdk
      ? new AIAgent({ llm, harness, wallet: sdk, onTransaction: printTransaction })
      : new AIAgent({ llm, harness });
    return { agent, sdk, chat: agent.createConversation({
      account: options.onbloc.account, contextTokens: options.contextTokens,
      allowTransactionPreparation: options.allowTransactionPreparation,
    }) };
  };
  let session = await newSession();

  let turnAbort: AbortController | null = null;
  rl.on('SIGINT', () => (turnAbort ? turnAbort.abort() : rl.close()));

  /** One question and the model's whole answer, tools included. */
  async function ask1(text: string) {
    const controller = new AbortController();
    turnAbort = controller;
    let lineOpen = false;
    const endLine = () => {
      if (lineOpen) process.stdout.write('\n');
      lineOpen = false;
    };

    try {
      const settings: ConversationSettings = {
        prompt: text,
        system: options.system,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      };
      const events = session.chat.run(settings, { signal: controller.signal });
      for await (const event of events) {
        switch (event.type) {
          case GenerateEventType.Text:
            process.stdout.write(event.delta);
            lineOpen = true;
            break;
          case GenerateEventType.Reasoning:
            break;
          case GenerateEventType.ToolCall:
            endLine();
            console.log(dim(`  > ${event.name}(${json(event.input)})${event.invalid ? '  [INVALID]' : ''}`));
            break;
          case GenerateEventType.ToolResult:
            console.log(dim(`    -> ${json(event.output)}`));
            break;
          case GenerateEventType.ToolError:
            console.log(dim(`    ! ${event.error}`));
            break;
          case GenerateEventType.Done: {
            endLine();
            const { totalMs, outputTokens, tokensPerSec } = event.metrics;
            const stats = [`${(totalMs / 1000).toFixed(1)}s`];
            if (outputTokens !== undefined) stats.push(`${outputTokens} tokens`);
            if (tokensPerSec !== undefined) stats.push(`${tokensPerSec.toFixed(1)} tok/s`);
            console.log(dim(`  (${event.aborted ? 'stopped, ' : ''}${stats.join(', ')})`));
            for (const warning of event.warnings) console.log(dim(`  warning: ${warning}`));
          }
        }
      }
    } catch (error) {
      endLine();
      console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('(this question was not added to the conversation)');
      if (options.prompt !== undefined) process.exitCode = 1;
    } finally {
      turnAbort = null;
    }
  }

  const mode = !options.onbloc ? 'plain chat (no wallet; --onbloc adds reads)'
    : options.allowTransactionPreparation ? 'Onbloc reads + mock transaction preparation (never signs or sends)'
      : 'Onbloc reads only (--allow-transaction-preparation enables mock transaction preparation)';
  console.error(`model: ${options.model} @ ${options.url} - ${mode}`);

  if (options.prompt !== undefined) {
    await ask1(options.prompt);
    rl.close();
    return;
  }

  console.error('Type a question. /help for commands, Ctrl-C to stop an answer or to quit.\n');
  while (true) {
    const line = await ask('> ');
    if (line === null) break;
    const text = line.trim();
    if (text === '') continue;

    if (text === '/exit' || text === '/quit') break;
    if (text === '/help') {
      console.log(USAGE.slice(USAGE.indexOf('In the chat:')));
    } else if (text === '/reset') {
      session.chat.reset();
      session = await newSession();
      console.log(session.sdk ? '  conversation and wallet reset' : '  conversation reset');
    } else if (text === '/balances') {
      if (session.sdk) printBalances(session.sdk.inspect().balances, you);
      else if (session.agent && options.onbloc) {
        try {
          const balance = await session.agent.getBalance({ kind: 'all' }, { account: options.onbloc.account });
          console.log(`  ${formatBalance(balance)}`);
        } catch (error) {
          console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else console.log('  No wallet: start with --onbloc.');
    } else if (text.startsWith('/')) {
      console.log(`  unknown command: ${text} (try /help)`);
    } else {
      await ask1(text);
    }
  }
  rl.close();
}

main().then(
  // Exit explicitly: after Ctrl-C the aborted request keeps the process alive.
  () => process.exit(process.exitCode ?? 0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    console.error(`\n${USAGE}`);
    process.exit(1);
  }
);
