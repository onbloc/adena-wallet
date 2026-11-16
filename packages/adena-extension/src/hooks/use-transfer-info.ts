import { TransferState } from '@states';
import { useAtom } from 'jotai';

import { TransferInfo } from '../states/transfer';

interface UseTransferInfoReturn {
  memorizedTransferInfo: TransferInfo | null;
  setMemorizedTransferInfo: (transferInfo: TransferInfo) => void;
  clear: () => void;
}

export const useTransferInfo = (): UseTransferInfoReturn => {
  const [memorizedTransferInfo, setMemorizedTransferInfo] = useAtom(
    TransferState.memorizedTransferInfo,
  );

  const clear = (): void => {
    setMemorizedTransferInfo(null);
  };

  return {
    memorizedTransferInfo,
    setMemorizedTransferInfo,
    clear,
  };
};
