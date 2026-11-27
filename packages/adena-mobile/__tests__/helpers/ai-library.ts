import { loadAiLibrary } from '../../src/infrastructure/ai/ai-library';

export { fakeOnblocMcp } from '../../../adena-ai/src/harness/mcp/testing/fakeOnblocMcp';

// Exercise the production gateway without loading optional native device modules.
export const loadRealAiLibrary = loadAiLibrary;
