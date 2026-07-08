import { GNO_ADDRESS_PREFIX as GNO_PREFIX } from '@common/constants/chain.constant';
import { GAS_FEE_SAFETY_MARGIN, MINIMUM_GAS_PRICE } from '@common/constants/gas.constant';
import { Account, Document, documentToDefaultTx } from 'adena-module';

export const SESSION_ADMIN_GAS_ESTIMATE_LIMIT = 10_000_000;
export const SESSION_ADMIN_GAS_WANTED_FALLBACK = 2_000_000;
export const SESSION_ADMIN_GAS_FEE_FLOOR_UGNOT = 1_000;

export interface SessionAdminGasInfo {
  gasWanted: number;
  gasFeeUgnot: number;
  gasUsed: number | null;
  estimated: boolean;
}

export type SessionAdminMessage = { type: string; value: unknown };

interface SessionAdminGnoProviderLike {
  getGasPrice?: () => Promise<number | null>;
}

interface SessionAdminTransactionServiceLike {
  createDocument: (
    account: Account,
    chainId: string,
    messages: SessionAdminMessage[],
    addressPrefix: string,
    gasWanted?: number,
    gasFee?: number,
    memo?: string,
  ) => Promise<Document>;
}

interface SessionAdminTransactionGasServiceLike {
  estimateGas?: (tx: ReturnType<typeof documentToDefaultTx>) => Promise<number>;
}

export const resolveSessionAdminGasFee = async (
  gnoProvider: SessionAdminGnoProviderLike | null | undefined,
  gasWanted = SESSION_ADMIN_GAS_WANTED_FALLBACK,
): Promise<number> => {
  const gasPrice = await gnoProvider?.getGasPrice?.().catch(() => null);
  const computedFee = Math.ceil((gasPrice ?? MINIMUM_GAS_PRICE) * gasWanted);
  return Math.max(SESSION_ADMIN_GAS_FEE_FLOOR_UGNOT, computedFee);
};

export const resolveSessionAdminGasInfo = async ({
  gnoProvider,
  transactionService,
  transactionGasService,
  masterAccount,
  chainId,
  message,
}: {
  gnoProvider: SessionAdminGnoProviderLike | null | undefined;
  transactionService: SessionAdminTransactionServiceLike | null | undefined;
  transactionGasService: SessionAdminTransactionGasServiceLike | null | undefined;
  masterAccount: Account;
  chainId: string;
  message: SessionAdminMessage;
}): Promise<SessionAdminGasInfo> => {
  const fallbackFeeUgnot = await resolveSessionAdminGasFee(
    gnoProvider,
    SESSION_ADMIN_GAS_WANTED_FALLBACK,
  );
  const fallbackGasInfo: SessionAdminGasInfo = {
    gasWanted: SESSION_ADMIN_GAS_WANTED_FALLBACK,
    gasFeeUgnot: fallbackFeeUgnot,
    gasUsed: null,
    estimated: false,
  };

  if (!transactionService || !transactionGasService?.estimateGas) {
    return fallbackGasInfo;
  }

  try {
    const estimateFeeUgnot = await resolveSessionAdminGasFee(
      gnoProvider,
      SESSION_ADMIN_GAS_ESTIMATE_LIMIT,
    );
    const estimateDocument = await transactionService.createDocument(
      masterAccount,
      chainId,
      [message],
      GNO_PREFIX,
      SESSION_ADMIN_GAS_ESTIMATE_LIMIT,
      estimateFeeUgnot,
      '',
    );
    const estimateTx = documentToDefaultTx(estimateDocument, masterAccount.publicKey);
    const gasUsed = await transactionGasService.estimateGas(estimateTx);
    const gasWanted = Math.max(1, Math.ceil(gasUsed * GAS_FEE_SAFETY_MARGIN));
    const gasFeeUgnot = await resolveSessionAdminGasFee(gnoProvider, gasWanted);

    return {
      gasWanted,
      gasFeeUgnot,
      gasUsed,
      estimated: true,
    };
  } catch {
    // Gas estimation is best-effort; fall back to static gas on any failure.
    return fallbackGasInfo;
  }
};
