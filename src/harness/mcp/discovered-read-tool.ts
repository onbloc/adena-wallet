import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { JsonSchemaValidator } from '@modelcontextprotocol/sdk/validation';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import { z } from 'zod';
import type { RemoteTool, WalletContext } from '../core';

/** Host-reviewed data permissions, independent of the server's tool annotations. */
export type DiscoveredReadPermission = Readonly<{
  /** Fields which may become required without granting access to new data. */
  requiredFields: readonly string[];
  account?: Readonly<{ field: string; unlessProvided?: string }>;
}>;

const record = z.record(z.string(), z.unknown());
const invalidInput = { kind: 'denied', code: 'INVALID_INPUT' } as const;
const invalidOutput = { kind: 'denied', code: 'INVALID_OUTPUT' } as const;
const maxResultChars = 12_000;
const identityField = /address|account|wallet|owner|chain(?:id)?|network/i;

// A new account/network selector requires a host review, even if the server calls it optional.
function hasUnreviewedIdentity(schema: unknown, boundField?: string, root = true): boolean {
  if (!schema || typeof schema !== 'object') return false;
  if (Array.isArray(schema)) return schema.some(value => hasUnreviewedIdentity(value, boundField, false));
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'properties' && value && typeof value === 'object' && !Array.isArray(value)) {
      if (Object.keys(value).some(name => identityField.test(name) && !(root && name === boundField))) return true;
    }
    if (hasUnreviewedIdentity(value, boundField, false)) return true;
  }
  return false;
}

// The model cannot supply an account selector or smuggle the active account in another field.
function containsAccount(value: unknown, account: string): boolean {
  if (typeof value === 'string') return value.toLowerCase().includes(account.toLowerCase());
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(item => containsAccount(item, account));
  return Object.entries(value).some(([key, item]) => identityField.test(key) || containsAccount(item, account));
}

/** Builds a discovered tool only when its data requirements fit the host's permission. */
export function discoveredReadTool({ tool, permission, context, validator, call, accepts }: {
  tool: Tool;
  permission: DiscoveredReadPermission;
  context: WalletContext;
  validator: AjvJsonSchemaValidator;
  call: (args: Record<string, unknown>) => Promise<CallToolResult>;
  accepts?: (data: Record<string, unknown>, input: Record<string, unknown>, accountBound: boolean) => boolean;
}): RemoteTool | undefined {
  const { name, description, inputSchema, outputSchema, annotations, execution } = tool;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(name) || execution?.taskSupport === 'required' ||
    annotations?.readOnlyHint === false || annotations?.destructiveHint === true) return undefined;
  const field = permission.account?.field;
  if ((field && !Object.hasOwn(inputSchema.properties ?? {}, field)) ||
    inputSchema.required?.some(required => !permission.requiredFields.includes(required) && required !== field) ||
    hasUnreviewedIdentity(inputSchema, field)) return undefined;

  let validate: JsonSchemaValidator<unknown>;
  let validateOutput: JsonSchemaValidator<unknown> | undefined;
  try {
    validate = validator.getValidator(inputSchema);
    validateOutput = outputSchema && validator.getValidator(outputSchema);
  } catch {
    return undefined;
  }

  const properties = { ...inputSchema.properties };
  if (field) delete properties[field];
  const jsonSchema = field ? {
    ...inputSchema,
    properties,
    required: inputSchema.required?.filter(required => required !== field),
  } : inputSchema;

  return {
    definition: { name, description: description ?? '', jsonSchema },
    async execute(raw) {
      const parsed = record.safeParse(raw);
      if (!parsed.success || containsAccount(parsed.data, context.account)) return invalidInput;
      const input = parsed.data;
      const alternative = permission.account?.unlessProvided;
      const alternativeValue = alternative ? input[alternative] : undefined;
      if (alternativeValue != null && (typeof alternativeValue !== 'string' || alternativeValue.trim() === '')) return invalidInput;
      const accountBound = field !== undefined && (alternativeValue == null);
      const args = accountBound ? { ...input, [field]: context.account } : input;
      if (!validate(args).valid) return invalidInput;

      const result = await call(args);
      if (result.isError) return { kind: 'denied', code: 'MCP_TOOL_ERROR' };
      if (result.structuredContent !== undefined) {
        if (JSON.stringify(result.structuredContent).length > maxResultChars) {
          return { kind: 'denied', code: 'MCP_RESULT_TOO_LARGE' };
        }
        if (validateOutput && !validateOutput(result.structuredContent).valid) return invalidOutput;
        const output = record.safeParse(result.structuredContent);
        if (!output.success || (accepts && !accepts(output.data, input, accountBound))) return invalidOutput;
        return { kind: 'result', value: { chainId: context.chainId, untrustedData: output.data } };
      }
      // An advertised output schema is an explicit contract, not a reason to fall back to text.
      // Account-scoped results, including balances, must always be structured.
      if (outputSchema || accountBound || !result.content.length || result.content.some(item => item.type !== 'text')) return invalidOutput;
      const texts = result.content.map(item => item.type === 'text' ? item.text : '');
      if (texts.reduce((size, text) => size + text.length, texts.length - 1) > maxResultChars) {
        return { kind: 'denied', code: 'MCP_RESULT_TOO_LARGE' };
      }
      const data = { text: texts.join('\n') };
      if (JSON.stringify(data).length > maxResultChars) return { kind: 'denied', code: 'MCP_RESULT_TOO_LARGE' };
      return { kind: 'result', value: { chainId: context.chainId, untrustedData: data } };
    },
  };
}
