if (globalThis.process?.env?.SMOKE_FIXTURE_FAIL_CONTENT) {
  throw new Error('content module failed to evaluate');
}
export const onExecute = () => {};
