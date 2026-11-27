import type * as OnblocMcp from '../onbloc-mcp';
import type * as FakeOnbloc from '../testing/fakeOnblocMcp';

const account = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
const endpoint = 'https://example.test/mcp';
const input = { page: { limit: 2 }, limit: 2 };
const output = {
  address: account,
  network: 'gnoland-1',
  items: [{ denom: 'ugnot', balance: '42' }],
};
const transferTool: FakeOnbloc.FakeOnblocTool = {
  name: 'list_native_transfers',
  inputSchema: {
    type: 'object',
    properties: {
      address: { type: 'string', pattern: '^g1[a-z0-9]+$' },
      page: {
        type: 'object',
        properties: { limit: { type: 'integer', minimum: 1, maximum: 10 } },
        required: ['limit'],
        additionalProperties: false,
      },
      limit: { type: 'integer', minimum: 1, maximum: 10 },
    },
    required: ['address', 'page', 'limit'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      address: { type: 'string' },
      network: { type: 'string' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            denom: { type: 'string' },
            balance: { type: 'string', pattern: '^[0-9]+$' },
          },
          required: ['denom', 'balance'],
          additionalProperties: false,
        },
      },
    },
    required: ['address', 'network', 'items'],
    additionalProperties: false,
  },
  output,
};

describe('Onbloc MCP without runtime code generation', () => {
  let controller: AbortController;
  let createOnblocReader: typeof OnblocMcp.createOnblocReader;
  let fakeOnblocMcp: typeof FakeOnbloc.fakeOnblocMcp;

  beforeEach(() => {
    controller = new AbortController();
    jest.spyOn(globalThis, 'Function').mockImplementation(() => {
      throw new Error('Runtime code generation is forbidden.');
    });
    jest.spyOn(globalThis, 'eval').mockImplementation(() => {
      throw new Error('Runtime code generation is forbidden.');
    });
    // Import after blocking code generation so Zod detects the runtime restrictions.
    jest.isolateModules(() => {
      ({ createOnblocReader } = jest.requireActual<typeof OnblocMcp>('../onbloc-mcp'));
      ({ fakeOnblocMcp } = jest.requireActual<typeof FakeOnbloc>('../testing/fakeOnblocMcp'));
    });
  });

  afterEach(() => {
    controller.abort();
    jest.restoreAllMocks();
  });

  it('discovers structured tools and validates their actual results without Function or eval', async () => {
    const { fetcher, calls } = fakeOnblocMcp([transferTool]);
    const tools = await createOnblocReader({ endpoint, fetcher })(account, controller.signal);
    const tool = tools.get(transferTool.name)!;

    expect([...tools.keys()]).toEqual([transferTool.name]);
    expect(tool.definition.jsonSchema).toMatchObject({
      properties: { page: transferTool.inputSchema!.properties!.page, limit: transferTool.inputSchema!.properties!.limit },
      required: ['page', 'limit'],
      additionalProperties: false,
    });
    expect(tool.definition.jsonSchema.properties).not.toHaveProperty('address');
    expect(await tool.execute(input)).toEqual({
      kind: 'result',
      value: { chainId: 'gnoland-1', untrustedData: output },
    });
    expect(calls).toEqual([{ name: transferTool.name, arguments: { ...input, address: account } }]);
  });

  it.each([
    ['missing required fields', {}],
    ['missing pagination limit', { page: input.page }],
    ['incorrect nested types', { ...input, page: { limit: '2' } }],
    ['out-of-range nested values', { ...input, page: { limit: 0 } }],
    ['out-of-range limits', { ...input, limit: 0 }],
    ['undeclared fields', { ...input, extra: true }],
    ['caller-supplied addresses', { ...input, address: account }],
  ])('rejects %s before calling the server', async (_label, invalidInput) => {
    const { fetcher, calls } = fakeOnblocMcp([transferTool]);
    const tools = await createOnblocReader({ endpoint, fetcher })(account, controller.signal);

    expect(await tools.get(transferTool.name)!.execute(invalidInput)).toEqual({ kind: 'denied', code: 'INVALID_INPUT' });
    expect(calls).toEqual([]);
  });

  it.each([
    ['missing required fields', { address: account, network: 'gnoland-1' }],
    ['incorrect nested types', { ...output, items: [{ denom: 'ugnot', balance: 42 }] }],
    ['invalid nested values', { ...output, items: [{ denom: 'ugnot', balance: '-1' }] }],
    ['undeclared fields', { ...output, extra: true }],
  ])('rejects outputs with %s after calling the server', async (_label, invalidOutput) => {
    const { fetcher, calls } = fakeOnblocMcp([{ ...transferTool, output: invalidOutput }]);
    const tools = await createOnblocReader({ endpoint, fetcher })(account, controller.signal);

    expect(await tools.get(transferTool.name)!.execute(input)).toEqual({ kind: 'denied', code: 'INVALID_OUTPUT' });
    expect(calls).toEqual([{ name: transferTool.name, arguments: { ...input, address: account } }]);
  });
});
