import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { createServerScenarioRunner, GNS_PATH, serverUrl } from './harness';

jest.setTimeout(5 * 60_000);

// The model must discover the file from the index, not infer it from the package name.
const filename = 'ledger.gno';
const signature = 'func BalanceOf(owner address) uint64';
const content = `package gns\n// Returns the balance for the supplied owner.\n${signature} {\n\treturn ledger.Balance(owner)\n}`;
const question = `${GNS_PATH} realm에서 BalanceOf 함수가 어떤 파일에 정의되어 있고 무슨 일을 하는지 알려줘.`;

function reads(sourcePath: string) {
  return fakeOnblocMcp([
    { name: 'get_token_info', description: 'Look up metadata for a token.', output: { symbol: 'GNS' } },
    { name: 'get_realm_info', description: 'List realm functions, their signatures, source files and line numbers.',
      output: { path: GNS_PATH, functions: [{ name: 'BalanceOf', signature, filename, line: 3 }], sourceFiles: [filename] } },
    { name: 'get_realm_source', description: 'Read the contents of a named source file in a realm.',
      output: { path: sourcePath, filename, content } },
  ]);
}

it.each([['한국어', question], ['English', `Which file implements BalanceOf in ${GNS_PATH}, and what does it return?`]])(
  '%s: locate a named function and explain it using the returned source', async (_, prompt) => {
    const run = await (await createServerScenarioRunner(serverUrl(), false, () => reads(GNS_PATH))).ask(prompt);
    expect(run.prepared).toEqual([]);
    expect(run.calls.filter(call => call.name.startsWith('get_realm_')).map(({ name, input }) => ({ name, input }))).toEqual([
      { name: 'get_realm_info', input: { path: GNS_PATH } }, { name: 'get_realm_source', input: { path: GNS_PATH, filename } },
    ]);
    expect(run.text).toContain(filename);
    expect(run.text).toContain('BalanceOf');
    expect(run.text).toMatch(/ledger\.Balance\(owner\)|balance for the supplied owner/i);
  });

it('does not attribute a different realm’s source to the requested function', async () => {
  const run = await (await createServerScenarioRunner(serverUrl(), false, () => reads('gno.land/r/demo/other'))).ask(question);
  expect(run.calls).toContainEqual(expect.objectContaining({ name: 'get_realm_source', input: { path: GNS_PATH, filename } }));
  expect(run.prepared).toEqual([]);
  expect(run.text).not.toContain('ledger.Balance');
  expect(run.text).toMatch(/could not be verified|확인할 수 없/);
});
