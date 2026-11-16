import { isSessionAccount } from 'adena-module';

import { InjectionMessage } from '../message';
import { createSessionAccountUnsupportedResponse } from '../session-account-response';
import { InjectCore } from './core';

export const rejectSessionAccountUnsupported = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (message: any) => void,
): Promise<boolean> => {
  const inMemoryKey = await core.getInMemoryKey();
  const currentAccount = await core.getCurrentAccount(inMemoryKey);

  if (!currentAccount || !isSessionAccount(currentAccount)) {
    return false;
  }

  sendResponse(createSessionAccountUnsupportedResponse(requestData.key));
  return true;
};
