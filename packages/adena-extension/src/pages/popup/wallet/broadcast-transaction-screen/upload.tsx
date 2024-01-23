import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { Tx } from '@gnolang/tm2-js-client';

import { CommonFullContentLayout, Pressable, Text, View } from '@components/atoms';
import { BottomFixedButtonGroup } from '@components/molecules';
import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import { TransactionDisplayInfo } from '@hooks/wallet/broadcast-transaction/use-broadcast-transaction-screen';
import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';
import BroadcastTransactionUploadInput from '@components/pages/broadcast-transaction-screen/broadcast-transaction-upload-input/broadcast-transaction-upload-input';
import BroadcastTransactionUploadResult from '@components/pages/broadcast-transaction-screen/broadcast-transaction-upload-result/broadcast-transaction-upload-result';
import IconHelp from '@assets/help.svg';

const StyledWrapper = styled(View)`
  width: 360px;
  gap: 24px;
  padding: 24px 20px 120px;
`;

const StyledHeaderWrapper = styled(View)`
  gap: 12px;
  justify-content: center;
  align-items: center;
`;

const StyledInputWrapper = styled(View)`
  gap: 12px;
`;

const StyledHelpWrapper = styled(Pressable)`
  flex-direction: row;
  gap: 6px;
  justify-content: center;
  align-items: center;
`;

interface BroadcastTransactionUploadProps {
  transaction: Tx | null;
  transactionInfos: TransactionDisplayInfo[];
  rawTransaction: string;
  broadcast: () => Promise<boolean>;
  uploadTransaction: (text: string) => boolean;
}

const BroadcastTransactionUpload: React.FC<BroadcastTransactionUploadProps> = ({
  transaction,
  transactionInfos,
  rawTransaction,
  broadcast,
  uploadTransaction,
}) => {
  const theme = useTheme();
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const { openLink } = useLink();
  const { goBack } = useAppNavigate();

  const loadedTransaction = useMemo(() => {
    return transaction !== null && transactionInfos.length > 0;
  }, [transaction]);

  const onClickBroadcast = useCallback(() => {
    if (isBroadcasting) {
      return;
    }
    setIsBroadcasting(true);
    broadcast().finally(() => setIsBroadcasting(false));
  }, [broadcast]);

  const onClickCancel = useCallback(() => {
    goBack();
  }, [goBack]);

  const onClickHelp = useCallback(() => {
    openLink(ADENA_DOCS_PAGE);
  }, [broadcast]);

  const blockEvent = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    window.addEventListener('drop', blockEvent, false);
    window.addEventListener('dragover', blockEvent, false);
    return () => {
      window.removeEventListener('drop', blockEvent);
      window.removeEventListener('dragover', blockEvent);
    }
  }, []);

  return (
    <CommonFullContentLayout>
      <StyledWrapper>
        <StyledHeaderWrapper>
          <Text type='header4' textAlign='center'>
            {'Broadcast Transaction'}
          </Text>
          <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
            {'Upload a signed transaction file to\nAdena to broadcast it.'}
          </Text>
        </StyledHeaderWrapper>

        <StyledInputWrapper>
          <BroadcastTransactionUploadInput
            transaction={transaction}
            uploadTransaction={uploadTransaction}
          />
          {loadedTransaction && (
            <BroadcastTransactionUploadResult
              rawTransaction={rawTransaction}
              transactionInfos={transactionInfos}
            />
          )}
        </StyledInputWrapper>

        {!loadedTransaction && (
          <StyledHelpWrapper onClick={onClickHelp}>
            <Text type='body1Reg' color={theme.neutral.a}>
              {'How does it work'}
            </Text>
            <img src={IconHelp} alt='help icon' />
          </StyledHelpWrapper>
        )}
      </StyledWrapper>

      <BottomFixedButtonGroup
        filled
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={{
          primary: true,
          disabled: !loadedTransaction,
          text: 'Broadcast',
          onClick: onClickBroadcast,
        }}
      />
    </CommonFullContentLayout >
  );
};

export default BroadcastTransactionUpload;