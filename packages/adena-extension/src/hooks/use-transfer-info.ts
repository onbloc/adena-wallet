import { TransferState } from '@states';
import { useRecoilState } from 'recoil';
import { TransferInfo } from 'src/states/transfer';

interface UseTransferInfoReturn {
  memorizedTransferInfo: TransferInfo | null;
  setMemorizedTransferInfo: (transferInfo: TransferInfo) => void;
  clear: () => void;
}

export const useTransferInfo = (): UseTransferInfoReturn => {
  const [memorizedTransferInfo, setMemorizedTransferInfo] = useRecoilState(
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
