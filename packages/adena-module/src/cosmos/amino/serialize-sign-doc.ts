// Thin re-export so Cosmos callers depend on this module (not @cosmjs/amino
// directly). Gives a single hook point for future regression tests around
// the escape / sortedJsonStringify contract.
//
// serializeSignDoc = sortedJsonStringify + escapeCharacters(<,>,&) + UTF-8.
// Reference: node_modules/@cosmjs/amino/build/signdoc.js:61-64
export { serializeSignDoc } from '@cosmjs/amino';
