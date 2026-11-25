import type { PreparationProposal } from './requestIntent';

type Operation = Exclude<PreparationProposal, { operation: 'clarification' }>['operation'];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const identifier = String.raw`[\p{L}\p{N}][\p{L}\p{N}._:/-]*`;
const separator = String.raw`(?:,|&|\b(?:and|or)\b|이랑|랑|하고|와|과|및|또는|이나|나)`;
const quantity = String.raw`(?:\d+(?:\.\d+)?%?|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter|all)`;
const assetWord = String.raw`[\p{L}][\p{L}\p{N}._:/-]*`;
const assetItem = String.raw`(?:${quantity}\s*(?:of\s+(?:the\s+)?(?:token\s+at\s+)?)?${assetWord}|${assetWord}\s*${quantity}\s*(?:개|개씩)?)`;
const coordinatedAmounts = new RegExp(String.raw`(?<![\p{L}\p{N}_])${assetItem}\s*${separator}\s*${assetItem}(?![a-z0-9._:/-])`, 'iu');
const separatedAmounts = new RegExp(String.raw`(?<![\p{L}\p{N}_])${assetItem}[^!?;\n]{0,160}?${separator}\s*${assetItem}(?![a-z0-9._:/-])`, 'iu');
const nonIdentifier: Record<string, true> = {
  a: true, an: true, and: true, approve: true, but: true, do: true, dont: true, for: true, from: true,
  it: true, just: true, no: true, not: true, or: true, please: true, send: true, then: true, thank: true,
  thanks: true, the: true, to: true, transfer: true, with: true,
};

// Quoted instructions are data, not a request from the account owner.
function withoutQuotations(text: string): string {
  return text.replace(/"[^"\n]*"|“[^”\n]*”|`[^`\n]*`/gu, ' ')
    .replace(/(^|[^\p{L}\p{N}])'[^'\n]*'(?=$|[^\p{L}\p{N}])/gu, '$1 ');
}

function asksAboutAction(text: string): boolean {
  return /\b(?:how|why|whether|what|when|where|who|if|recommend|recommendation|advice|advise|suggest|explain|hypothetical)\b/i.test(text)
    || /\b(?:should|shall|can|could|would|will|do|may|might)\s+(?:i|we)\b/i.test(text)
    || /\bshould\s+you\b/i.test(text)
    || /(?:어떻게|방법|좋을까|좋을까요|좋겠|괜찮을까|괜찮을까요|무슨\s*뜻|줘야\s*(?:할까|하나|할까요)|해야\s*(?:할까|하나|할까요)|(?:보낼|전송할|송금할)\s*(?:만큼|수\s*(?:있|없))|(?:보내면|전송하면|송금하면)\s*(?:될까|돼|좋|괜찮))/u.test(text);
}

// Only a command or a request addressed to the assistant is evidence of an English action.
function englishActions(text: string, proposal: Exclude<PreparationProposal, { operation: 'clarification' }>): Operation[] {
  const result: Operation[] = [];
  const verbs = /(?<![\p{L}\p{N}_/.-])(?:send|transfer|pay|remit|approve|allow|authorize|permit|let|grant)(?![\p{L}\p{N}_/-])/giu;
  for (const match of text.matchAll(verbs)) {
    const verb = match[0].toLowerCase();
    const before = text.slice(0, match.index);
    const sentence = before.split(/[.!?;\n]/u).at(-1) ?? '';
    const clause = (sentence.split(/,|\b(?:and|or|but|then)\b/iu).at(-1) ?? '').trim();
    if (/\b(?:do\s+not|don't|never|without|not)\b[^,;.!?]*\b(?:and|or)\s*$/iu.test(sentence)
      && !/\bbut\b/iu.test(sentence)) continue;
    const trailingTransfer = proposal.operation === 'transfer' && proposal.amount.kind === 'exact'
      && /^(?:send|transfer|pay|remit)$/u.test(verb)
      && /^[\s.!?]*$/u.test(text.slice(match.index + match[0].length))
      && new RegExp(String.raw`^\s*${escapeRegex(proposal.recipient)}\s+${escapeRegex(proposal.amount.value)}\s+${escapeRegex(proposal.asset.value)}\s*$`, 'iu').test(before);
    if (!/^(?:(?:hey|hi|okay|ok|well|please|kindly|just|now)\s*)*$/iu.test(clause)
      && !/\b(?:(?:can|could|will|would)\s+you(?:\s+(?:please|kindly|just))?|you\s+to(?:\s+(?:please|kindly))?|let['’]s)\s*$/iu.test(clause)
      && !/^(?:(?:please|kindly|just)\s+)*(?:prepare|draft|create)(?:\s+an?)?$/iu.test(clause)
      && !trailingTransfer) continue;
    if (verb === 'let' && /^['’]s\b/iu.test(text.slice(match.index + match[0].length))) continue;
    if (verb === 'grant' && !/\b(?:allowance|approval|permission)\b/iu.test(text.slice(match.index + match[0].length))) continue;
    result.push(/^(?:send|transfer|pay|remit)$/u.test(verb) ? 'transfer' : 'approve');
  }
  return result;
}

function koreanActions(text: string): Operation[] {
  const result: Operation[] = [];
  const expressions: [Operation, RegExp][] = [
    ['transfer', /(?:보내\s*(?:줘|주세요|줄|라|세요|(?=$|[.!?]))|(?:송금|전송|이체)\s*(?:해|하(?:세요|여|라)|(?=$|[.!?])))/gu],
    ['approve', /(?:(?:승인|허용)\s*(?:해|하(?:세요|여|라)|(?=$|[.!?]))|(?:쓸|사용할|쓰도록|사용하도록)\s*(?:수\s*(?:있게|있도록)\s*)?(?:해줘|해주세요|해줄|해\s*(?=$|[.!?])))/gu],
  ];
  for (const [operation, expression] of expressions) {
    for (const match of text.matchAll(expression)) {
      const before = text.slice(0, match.index);
      const after = text.slice(match.index + match[0].length);
      if (/(?:안|못)\s*$/u.test(before) || /^(?:주|드리|하|해|줄)?지\s*(?:마|말|않|못)|^(?:서는|면|도)?\s*안\s*(?:돼|되)/u.test(after)) continue;
      result.push(operation);
    }
  }
  // A connective action before a requested action is a second task, not merely context.
  if (result.length) {
    if (/보내고|(?:송금|전송|이체)하고/u.test(text)) result.push('transfer');
    if (/(?:승인|허용)하고/u.test(text)) result.push('approve');
  }
  return result;
}
function negatesAction(text: string, operation: Operation): boolean {
  if (operation === 'transfer') {
    return /\b(?:do\s+not|don't|never|without|not\s+to)\s+(?:(?:ever|actually|please)\s+)*(?:send|sending|transfer|transferring|pay|paying|remit)\b/iu.test(text)
      || /(?:안|못)\s*(?:보내|송금|전송|이체)|(?:보내|송금|전송|이체).{0,8}(?:지\s*(?:마|말|않)|하지\s*(?:마|말|않))/u.test(text);
  }
  return /\b(?:do\s+not|don't|never|without|not\s+to)\s+(?:(?:ever|actually|please)\s+)*(?:approve|approving|allow|allowing|authorize|permit|grant)\b/iu.test(text)
    || /(?:안|못)\s*(?:승인|허용)|(?:승인|허용).{0,8}(?:지\s*(?:마|말|않)|하지\s*(?:마|말|않))/u.test(text);
}


function coordinatedAssets(text: string, asset: string): boolean {
  if (coordinatedAmounts.test(text) || separatedAmounts.test(text)) return true;
  const named = escapeRegex(asset);
  const after = new RegExp(String.raw`(?<![\p{L}\p{N}_/.-])${named}\s*${separator}\s*(?:${quantity}\s*)?(${assetWord})`, 'iu').exec(text);
  if (after && !Object.hasOwn(nonIdentifier, after[1].toLowerCase())
    && !/^(?:can|could|will|would)\s+you\b/iu.test(text.slice(after.index + after[0].length - after[1].length))) return true;
  const before = new RegExp(String.raw`(?<![\p{L}\p{N}_/.-])(${assetWord})\s*${separator}\s*(?:${quantity}\s*)?${named}(?![a-z0-9._:/-])`, 'iu').exec(text);
  return !!before && !Object.hasOwn(nonIdentifier, before[1].toLowerCase());
}

function coordinatedRecipients(text: string, recipient: string): boolean {
  const name = escapeRegex(recipient);
  const expressions = [
    new RegExp(String.raw`(?<![\p{L}\p{N}_])${name}\s*(?:,|&|\b(?:and|or)\b)\s*(?:to\s+)?(${identifier})`, 'iu'),
    new RegExp(String.raw`(?<![\p{L}\p{N}_])(${identifier})\s*(?:,|&|\b(?:and|or)\b)\s*(?:to\s+)?${name}(?![\p{L}\p{N}_])`, 'iu'),
    new RegExp(String.raw`(?<![\p{L}\p{N}_])${name}(?:이랑|랑|하고|와|과)\s*(${identifier})(?:에게|한테|께|\s*(?:주소)?로)`, 'iu'),
    new RegExp(String.raw`(?<![\p{L}\p{N}_])(${identifier})(?:이랑|랑|하고|와|과)\s*${name}(?:에게|한테|께|\s*(?:주소)?로)`, 'iu'),
    new RegExp(String.raw`(?<![\p{L}\p{N}_])${name}(?:에게|한테|께)\s*(?:및|그리고|또는)\s*(${identifier})(?:에게|한테|께)`, 'iu'),
    new RegExp(String.raw`(?<![\p{L}\p{N}_])(${identifier})(?:에게|한테|께)\s*(?:및|그리고|또는)\s*${name}(?:에게|한테|께)`, 'iu'),
  ];
  return expressions.some(expression => {
    const other = expression.exec(text)?.[1]?.toLowerCase();
    return other !== undefined && other !== recipient.toLowerCase() && !Object.hasOwn(nonIdentifier, other);
  });
}

/** Model output is a proposal: verify that one matching action is requested in the current turn. */
export function preparationEvidence(text: string, proposal: Exclude<PreparationProposal, { operation: 'clarification' }>): 'action' | 'multiple' | undefined {
  const request = withoutQuotations(text);
  if (asksAboutAction(request)) return 'action';
  const actions = [...englishActions(request, proposal), ...koreanActions(request)];
  if (!actions.includes(proposal.operation) || negatesAction(request, proposal.operation)) return 'action';
  // Quoted identifiers can still name additional recipients/assets, even though quoted
  // instructions alone are never evidence that an action was requested.
  let identifiers = text.replace(/["'“”‘’`]/gu, '')
    .replace(/\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+and\s+a\s+half\b/giu, '0');
  if (!/["'“”‘’`]/u.test(text)) {
    const asset = escapeRegex(proposal.asset.value);
    const correction = new RegExp(String.raw`(\d+(?:\.\d+)?)(\s+${asset}\s+[^,;!?]*),\s*아니\s*(?:잠깐)?\s*,?\s*(\d+(?:\.\d+)?\s+${asset})(?=$|[^\p{L}\p{N}_/]|\p{Script=Hangul})`, 'iu');
    identifiers = identifiers.replace(correction, ' $2 $3');
  }
  if (actions.length !== 1 || coordinatedAssets(identifiers, proposal.asset.value) || coordinatedRecipients(identifiers, proposal.recipient)) return 'multiple';
  return undefined;
}
