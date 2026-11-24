import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
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
