// Thin re-export so Cosmos callers depend on this module (not @cosmjs/amino
// directly). Gives a single hook point for future regression tests around
// the escape / sortedJsonStringify contract.
//
// serializeSignDoc = sortedJsonStringify + escapeCharacters(<,>,&) + UTF-8.
// Reference: serializeSignDoc in the package signdoc implementation.
export { serializeSignDoc } from '@cosmjs/amino';
