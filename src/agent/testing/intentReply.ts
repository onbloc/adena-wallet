import type { RequestIntent } from '../requestIntent';

/** Encode the model's wire response without coupling callers to classifier prompts. */
export function intentReplyText(intent: RequestIntent): string {
  switch (intent.kind) {
    case 'lookup':
      return JSON.stringify({
        route: intent.explanation === undefined ? 'lookup' : 'lookup_explanation',
        requests: intent.requests,
        ...(intent.explanation === undefined ? {} : { explanation: intent.explanation }),
      });
    default:
      return JSON.stringify({ route: intent.kind });
  }
}
