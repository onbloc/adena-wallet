/** A Korean postposition directly after a name, ending at a word boundary (민수에게, carol을). */
export const KOREAN_PARTICLE = /^(?:에게로|한테로|께서는|에게|한테|으로|께서|에서|부터|까지|은|는|이|가|을|를|에|로|와|과|께|도|만)(?![\p{L}\p{M}\p{N}_])/u;
