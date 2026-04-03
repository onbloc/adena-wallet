export type OnAccountChangeFunc = (address: string) => void;
export type OnNetworkChangeFunc = (network: string) => void;

type OnEventType = 'changedAccount' | 'changedNetwork';

type OnEventFunc = OnAccountChangeFunc | OnNetworkChangeFunc;

export type AdenaOnEvent = (event: OnEventType, func: OnEventFunc) => void;
