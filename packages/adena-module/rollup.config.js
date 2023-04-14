const builtins = require('rollup-plugin-node-builtins');
const nodeResolve = require('@rollup/plugin-node-resolve');
const { default: dotenv } = require("rollup-plugin-dotenv");
const typescript = require('rollup-plugin-typescript2');
const path = require('path');
const merge = require('lodash.merge');
const pkg = require('./package.json');

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
  },
  {
    file: pkg.module,
    format: 'esm',
  },
];

module.exports = merge({
  input: resolve('index.ts'),
  output: jobs,
  plugins: [
    builtins(),
    dotenv(),
    nodeResolve({
      extensions,
      modulesOnly: true,
    }),
    typescript({
      tsconfig: 'tsconfig.json',
    }),
  ],
  onwarn: function (warning) {
    if (warning.code === 'THIS_IS_UNDEFINED') { return; }
  }
});
