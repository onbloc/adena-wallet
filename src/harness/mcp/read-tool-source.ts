import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { discoveredReadTool } from './discovered-read-tool';
import type { RemoteTool, ToolSource, WalletContext } from '../core';

/** Only host-reviewed, read-only operations belong here; never derive this list from server hints. */
export type McpReadOperation = Readonly<{
  description: string;
  inputSchema: RemoteTool['definition']['jsonSchema'];
  /** Validate model input and bind account/chain locally; undefined rejects the call. */
  arguments(input: unknown, context: WalletContext): Record<string, unknown> | undefined;
  /** Validate structuredContent against the provider contract; undefined rejects the result. */
  parse(output: unknown, context: WalletContext): unknown;
}>;

/** The host owns the connected client and transport. Closing a run cancels calls, not the shared client. */
export function createMcpReadToolSource(config: {
  namespace: string;
  client: Pick<Client, 'callTool'>;
  supports(context: WalletContext): boolean;
  operations: Readonly<Record<string, McpReadOperation>>;
}): ToolSource {
  if (!/^[a-z][a-z0-9_]*$/.test(config.namespace)) throw new TypeError('Invalid MCP namespace');
  const operations = Object.entries(config.operations).map(([name, operation]) => {
    const qualified = `${config.namespace}__${name}`;
    if (!/^[a-zA-Z0-9_-]+$/.test(name) || qualified.length > 64) throw new TypeError('Invalid MCP tool name');
    return { name, qualified, operation };
  });
  return async (context, signal) => {
    const tools = new Map<string, RemoteTool>();
    if (!config.supports(context)) return tools;
    for (const { name, qualified, operation } of operations) {
      tools.set(qualified, {
        definition: { name: qualified, description: operation.description, jsonSchema: operation.inputSchema },
        async execute(input) {
          const args = operation.arguments(input, context);
          if (!args) return { kind: 'denied', code: 'INVALID_INPUT' };
          const result = await config.client.callTool({ name, arguments: args }, undefined, { signal });
          if (result.isError) return { kind: 'denied', code: 'MCP_TOOL_ERROR' };
          const raw = result.structuredContent;
          if (!raw) return { kind: 'denied', code: 'INVALID_OUTPUT' };
          if (JSON.stringify(raw).length > 12_000) return { kind: 'denied', code: 'MCP_RESULT_TOO_LARGE' };
          const data = operation.parse(raw, context);
          return data === undefined ? { kind: 'denied', code: 'INVALID_OUTPUT' }
            : { kind: 'result', value: { chainId: context.chainId, untrustedData: data } };
        },
      });
    }
    return tools;
  };
}

/**
 * Discover a catalog from a server the host independently trusts to enforce read-only access.
 * Never enable this based on a server annotation or a user-supplied endpoint.
 * The host owns the client and its transport.
 */
export function createTrustedMcpReadToolSource(config: {
  namespace: string;
  client: Pick<Client, 'listTools' | 'callTool'>;
  supports(context: WalletContext): boolean;
  trustedServerEnforcesReadOnly: true;
}): ToolSource {
  if (!/^[a-z][a-z0-9_]*$/.test(config.namespace)) throw new TypeError('Invalid MCP namespace');
  if (config.trustedServerEnforcesReadOnly !== true) throw new TypeError('Trusted read-only server required');
  return async (context, signal) => {
    const tools = new Map<string, RemoteTool>();
    if (!config.supports(context)) return tools;
    const validator = new AjvJsonSchemaValidator();
    const seen = new Set<string>();
    const cursors = new Set<string>();
    let cursor: string | undefined;
    let pages = 0;
    let count = 0;
    let chars = 0;
    const options = { signal, timeout: 12000 };
    do {
      if (signal.aborted) throw new Error('MCP discovery cancelled.');
      if (++pages > 4) throw new Error('MCP discovery exceeded the page limit.');
      const page = await config.client.listTools(cursor === undefined ? {} : { cursor }, options);
      count += page.tools.length;
      chars += JSON.stringify(page.tools).length;
      if (count > 32 || chars > 32_000) throw new Error('MCP discovery exceeded the catalog limit.');
      for (const tool of page.tools) {
        if (seen.has(tool.name)) throw new Error('Duplicate MCP tool name.');
        seen.add(tool.name);
        const qualified = `${config.namespace}__${tool.name}`;
        if (qualified.length > 64) continue;
        const remote = discoveredReadTool({
          tool,
          trustedServerEnforcesReadOnly: true,
          context,
          validator,
          call: async args => CallToolResultSchema.parse(await config.client.callTool({ name: tool.name, arguments: args }, undefined, options)),
        });
        if (remote) tools.set(qualified, { ...remote, definition: { ...remote.definition, name: qualified } });
      }
      cursor = page.nextCursor;
      if (cursor !== undefined) {
        if (cursors.has(cursor)) throw new Error('Repeated MCP tools cursor.');
        cursors.add(cursor);
      }
    } while (cursor !== undefined);
    if (signal.aborted) throw new Error('MCP discovery cancelled.');
    return tools;
  };
}
