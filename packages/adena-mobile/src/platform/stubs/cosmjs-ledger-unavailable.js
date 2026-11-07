// Stand-in for @cosmjs/ledger-amino on mobile (see ledger-unavailable.js).
// adena-module subclasses LedgerConnector when it loads, so the export has to
// be a real class; constructing it is what fails.
class LedgerUnavailable {
  constructor() {
    throw new Error('Ledger is not available on mobile yet');
  }
}

module.exports = {
  LedgerConnector: LedgerUnavailable,
  LedgerSigner: LedgerUnavailable,
};
