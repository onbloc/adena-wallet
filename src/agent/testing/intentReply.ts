import type { RequestIntent } from '../requestIntent';

/** Encode the model's wire response without coupling callers to classifier prompts. */
export function intentReplyText(intent: RequestIntent): string {
  switch (intent.kind) {
    case 'lookup': {
      const route = intent.target === 'other' ? 'lookup' : intent.target;
      return JSON.stringify(intent.token === undefined ? { route } : { route, token: intent.token });
    }
    case 'prepare':
      return JSON.stringify({ route: intent.action });
    default:
      return JSON.stringify({ route: intent.kind });
  }
}
