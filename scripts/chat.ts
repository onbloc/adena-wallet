/// <reference types="node" />
// Talk to the model in your own words, to see how far it gets. The model runs
// on this Mac via llama-server. By default it is the wallet assistant (the
// app's prompt and tools against a mock wallet); --plain talks to the bare model.
//
//   make chat                                   interactive
//   make chat PROMPT="Tell me my GNOT balance"   one question, then exit
//   bun scripts/chat.ts --plain
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

import type { LanguageModel, ModelMessage } from 'ai';

import { DEFAULT_GENERATE_SETTINGS, MAX_STEPS } from '../src/llm/config';
import { generate, GenerateEventType } from '../src/llm/generate';
import { describeRequest } from '../src/ui/describeRequest';
import { createWalletTools } from '../src/wallet/adapter/tools';
import { ApprovalPolicy } from '../src/wallet/constants';
import { snapshotBalances, WATCHED } from '../src/wallet/observation';
import { buildSystemPrompt } from '../src/wallet/prompts';
import { autoApproval } from '../src/wallet/sdk/approval';
import { ACTIVE_ADDRESS, FIXTURE } from '../src/wallet/sdk/fixture';
import { MockWalletSdk } from '../src/wallet/sdk/mockWalletSdk';
import type { ApprovalHandler, Balances } from '../src/wallet/sdk/types';
import { boundedNumber, parseArgs } from './lib/cli';
import { connectModel, DEFAULT_MODEL_NAME, DEFAULT_SERVER_URL } from './lib/server';

const ASK = 'ask';

const USAGE = `Usage: bun scripts/chat.ts [options]
  --prompt TEXT      ask once and exit instead of chatting
  --plain            the bare model: no wallet prompt, no tools
  --approval P       at a signing popup: ask (default, you answer y/N) | approve | reject
  --url URL          OpenAI-compatible base URL (default ${DEFAULT_SERVER_URL})
  --model NAME       model name sent to the server (default ${DEFAULT_MODEL_NAME})
  --temperature T    (default ${DEFAULT_GENERATE_SETTINGS.temperature})
  --max-tokens N     per model call (default ${DEFAULT_GENERATE_SETTINGS.maxOutputTokens})
  --max-steps N      model calls per question with tools (default ${MAX_STEPS})
  --system-file P    use this file as the system prompt

In the chat: /reset (forget the conversation, reset the wallet)  /balances  /help  /exit`;

type Options = {
  prompt?: string;
  plain: boolean;
  approval: typeof ASK | ApprovalPolicy;
  url: string;
  model: string;
  temperature: number;
  maxTokens: number;
  maxSteps: number;
  system?: string;
};

function parseOptions(argv: string[]): Options {
  const { values, flags } = parseArgs(argv, {
    values: ['prompt', 'approval', 'url', 'model', 'temperature', 'max-tokens', 'max-steps', 'system-file'],
    flags: ['plain'],
  });
  const approval = values.get('approval') ?? ASK;
  if (approval !== ASK && !Object.values(ApprovalPolicy).includes(approval as ApprovalPolicy)) {
    throw new Error(`--approval must be one of: ${[ASK, ...Object.values(ApprovalPolicy)].join(', ')}`);
  }
  const systemFile = values.get('system-file');

  return {
    prompt: values.get('prompt'),
    plain: flags.has('plain'),
    approval: approval as Options['approval'],
    url: values.get('url') ?? DEFAULT_SERVER_URL,
    model: values.get('model') ?? DEFAULT_MODEL_NAME,
    temperature: boundedNumber(values, 'temperature', DEFAULT_GENERATE_SETTINGS.temperature, 0, 2, false),
    maxTokens: boundedNumber(values, 'max-tokens', DEFAULT_GENERATE_SETTINGS.maxOutputTokens, 1, 4095),
    maxSteps: boundedNumber(values, 'max-steps', MAX_STEPS, 1, 20),
    system: systemFile ? readFileSync(systemFile, 'utf8') : undefined,
  };
}

const dim = (text: string) => (process.stdout.isTTY ? `\x1b[2m${text}\x1b[0m` : text);
const json = (value: unknown) => JSON.stringify(value) ?? 'undefined';

const formatBalances = (balances: Balances) =>
  Object.entries(balances)
    .map(([token, amount]) => `${amount} ${token}`)
    .join(', ');

function printBalances(balances: Record<string, Balances>) {
  for (const { label, address } of WATCHED) {
    const you = address === ACTIVE_ADDRESS ? ' (you)' : '';
    console.log(`  ${label}${you}: ${formatBalances(balances[address])}`);
  }
}

/** A wallet session: the mock wallet and the conversation so far. */
type Session = { sdk: MockWalletSdk; history: ModelMessage[] };

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

  // You answer the signing popup at the terminal, unless told otherwise or
  // there is no terminal to answer on.
  const interactive = process.stdin.isTTY === true;
  const requestApproval: ApprovalHandler =
    options.approval === ASK && interactive
      ? async (request) => {
          const { title, rows } = describeRequest(request);
          console.log(`\n  [signing popup] ${title}`);
          for (const [label, value] of rows) console.log(`    ${label}: ${value}`);
          const answer = await ask('  Approve? [y/N] ');
          return /^y(es)?$/i.test((answer ?? '').trim());
        }
      : autoApproval(options.approval === ASK ? ApprovalPolicy.Reject : options.approval);

  const newSession = (): Session => ({ sdk: new MockWalletSdk({ requestApproval }), history: [] });
  let session = newSession();

  const system = options.system ?? (options.plain ? undefined : buildSystemPrompt({ contacts: FIXTURE.contacts }));
  let turnAbort: AbortController | null = null;
  rl.on('SIGINT', () => (turnAbort ? turnAbort.abort() : rl.close()));

  /** One question and the model's whole answer, tools included. */
  async function ask1(text: string) {
    const messages: ModelMessage[] = [...session.history, { role: 'user', content: text }];
    const before = options.plain ? null : await snapshotBalances(session.sdk);
    const controller = new AbortController();
    turnAbort = controller;
    let lineOpen = false;
    const endLine = () => {
      if (lineOpen) process.stdout.write('\n');
      lineOpen = false;
    };

    try {
      for await (const event of generate(model, {
        messages,
        system,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        tools: options.plain ? undefined : createWalletTools({ sdk: session.sdk, activeAddress: ACTIVE_ADDRESS }),
        maxSteps: options.plain ? undefined : options.maxSteps,
        signal: controller.signal,
      })) {
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
            // A stopped turn is not remembered.
            if (!event.aborted) session.history = [...messages, ...event.messages];
          }
        }
      }
    } catch (error) {
      endLine();
      console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('(this question was dropped; /reset starts over if the conversation got too long)');
    } finally {
      turnAbort = null;
    }

    if (before) {
      const after = await snapshotBalances(session.sdk);
      if (json(after) !== json(before)) {
        console.log('  wallet balances changed:');
        printBalances(after);
      }
    }
  }

  const mode = options.plain ? 'bare model' : 'wallet assistant (mock wallet, tools on)';
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
      session = newSession();
      console.log('  conversation and wallet reset');
    } else if (text === '/balances') {
      printBalances(await snapshotBalances(session.sdk));
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
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    console.error(`\n${USAGE}`);
    process.exit(1);
  }
);
