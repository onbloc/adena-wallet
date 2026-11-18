/* global chrome, console */
// Same shape as the loader @crxjs/vite-plugin 3 writes for a content script.
(function () {
  'use strict';
  (async () => {
    const { onExecute } = await import(chrome.runtime.getURL('assets/content.js'));
    onExecute?.({});
  })().catch(console.error);
})();
