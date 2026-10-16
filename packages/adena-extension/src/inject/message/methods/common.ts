import { WalletResponseFailureType } from '@adena-wallet/sdk';
import { getSiteName } from '@common/utils/url-parameter-utils';
import { getApprovalPresenter } from '../approval-presenter';
import { InjectionMessage, InjectionMessageInstance } from '../message';
import { InjectCore } from './core';

export const createPopup = async (
  popupPath: string,
  message: InjectionMessage,
  closeMessage: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<void> => getApprovalPresenter().present(popupPath, message, closeMessage, sendResponse);

export const existsPopups = async (): Promise<boolean> =>
  getApprovalPresenter().hasOpenApprovals();

export const removePopups = async (): Promise<void> => getApprovalPresenter().dismissAll();

export const checkEstablished = async (
  core: InjectCore,
  requestData: InjectionMessage,
  sendResponse: (response: any) => void,
): Promise<boolean> => {
  const accountId = await core.getCurrentAccountId();

  const siteName = getSiteName(requestData.protocol, requestData.hostname);
  const isEstablished = await core.establishService.isEstablishedBy(accountId, siteName);
  if (!isEstablished) {
    sendResponse(
      InjectionMessageInstance.failure(
        WalletResponseFailureType.NOT_CONNECTED,
        {},
        requestData.key,
      ),
    );
    return false;
  }
  return true;
};
