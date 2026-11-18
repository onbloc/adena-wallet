import type { InjectionMessage } from './message';

// Requester identity only the agent host may use.
const AGENT_PROTOCOL = 'agent:';

const senderUrl = (sender: chrome.runtime.MessageSender): URL | null => {
  for (const source of [sender.origin, sender.url]) {
    if (!source) continue;
    try {
      return new URL(source);
    }
    catch {
      // Try the next source.
    }
  }
  return null;
};

// Web pages pick the protocol and hostname of their requests, so a page could
// claim to be a connected site or agent. Requests from web pages take their
// identity from the sender instead; extension pages keep theirs.
export const withSenderIdentity = (
  message: InjectionMessage,
  sender: chrome.runtime.MessageSender,
  extensionOrigin: string,
): InjectionMessage | null => {
  const fromExtension = !sender.tab || (sender.url ?? '').startsWith(extensionOrigin);
  if (fromExtension) {
    return message;
  }

  const url = senderUrl(sender);
  if (!url || url.protocol === AGENT_PROTOCOL) {
    return null;
  }
  return { ...message, protocol: url.protocol, hostname: url.hostname };
};
