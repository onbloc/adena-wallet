// Free `Buffer` / `process` references in the page bundle resolve here, as
// webpack's ProvidePlugin/NodePolyfillPlugin do for the extension build.
export {Buffer} from 'buffer';
export {default as process} from 'process/browser.js';
