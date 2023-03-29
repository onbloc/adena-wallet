const path = require('path');
const babel = require('rollup-plugin-babel');
const rollupNodeResolve = require('rollup-plugin-node-resolve');
const merge = require('lodash.merge');
const pkg = require('./package.json');

const typescript = require('rollup-plugin-typescript2');

const extensions = ['.js', '.ts', '.jsx', '.tsx'];

const resolve = function (...args) {
  const __dirname = path.resolve();
  return path.resolve(__dirname, ...args);
};

//
const jobs = [
  {
    file: pkg.main,
    format: 'umd',
    name: pkg.name,
    sourcemap: true,
  },
  {
    file: pkg.module,
    format: 'esm',
    sourcemap: true,
  },
];

module.exports = merge({
  input: resolve('./index.ts'),
  output: jobs,
  plugins: [
    rollupNodeResolve({ preferBuiltins: true, browser: true }),
    typescript({
      tsconfig: 'tsconfig.json'
    }),
    babel({
      extensions,
    }),
  ],
});
