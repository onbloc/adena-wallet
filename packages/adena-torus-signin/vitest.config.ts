import {
  resolve,
} from "node:path";

import {
  defineConfig,
} from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    env: {
      SIGNER_PREFIX: "g",
      SALT_KEY: "TESTTESTTESTTEST",
    },
    coverage: {
      provider: "istanbul",
    },
  },
});
