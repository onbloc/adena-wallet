import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import gnotLogo from '../../../../assets/gnot-logo-white.svg';
import { useSdk } from '@services/client';
import { Secp256k1HdWallet } from '@services/signer';
import { GnoClient } from '@services/lcd';
import Typography, { textVariants } from '@ui/common/Typography';
import CancelAndConfirmButton from '@ui/common/Button/CancelAndConfirmButton';
import ApproveTransactionLoading from './ApproveTransactionLoading';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { walletDeserialize, getSavedPassword } from '@services/client/fetcher';

interface DLProps {
  color?: string;
  rounded?: boolean;
}

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  .logo {
    margin: 24px auto;
  }
`;

const RoundedBox = styled.span`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  width: 100%;
  height: 41px;
  border-radius: 24px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  padding: 0px 18px;
`;

const DataBoxStyle = styled.div`
  ${textVariants.body1Reg};
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'center')};
  width: 100%;
  dl {
    background-color: ${({ theme }) => theme.color.neutral[8]};
    padding: 0px 20px 0px 17px;
  }
  dd {
    color: ${({ theme }) => theme.color.neutral[0]};
  }
`;

const DLWrapStyle = styled.dl`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  ${textVariants.body1Reg};
  width: 100%;
  padding: 0px 18px;
`;

const BundleDataBox = styled(DataBoxStyle)`
  margin: 8px 0px 10px;
  gap: 2px;
  dt {
    color: ${({ theme }) => theme.color.neutral[4]};
  }
  & dl:first-child {
    border-top-left-radius: 18px;
    border-top-right-radius: 18px;
  }
  & dl:last-child {
    border-bottom-left-radius: 18px;
    border-bottom-right-radius: 18px;
  }
`;

const RoundedDataBox = styled(DataBoxStyle)`
  dt {
    color: ${({ theme }) => theme.color.neutral[2]};
  }
`;

const BundleDL = styled(DLWrapStyle)`
  height: 44px;
`;

const RoundedDL = styled(DLWrapStyle)`
  height: 48px;
  border-radius: 30px;
  border: 1px solid ${({ theme }) => theme.color.neutral[3]};
`;

export const ApproveTransactionView = () => {
  const sdk = useSdk();
  const navigate = useNavigate();
  const [isLogined, setIsLogined] = useState(true);
  const [loading, setLoading] = useState(true);
  const getDataRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const childRef = useRef<HTMLDivElement>(null);
  const contractRef = useRef<HTMLInputElement>(null);
  const functionRef = useRef<HTMLInputElement>(null);
  const argsRef = useRef<HTMLTextAreaElement>(null);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [walletString, SetWalletString] = useState<string>();
  const [reqAddr, setReqAddr] = useState<string>('');
  const [gasFee, setGasFee] = useState<string>();
  const [origin, setOrigin] = useState<string>('https://gno.land');

  const Login = () => {
    getSavedPassword().then((pwd: string) => {
      walletDeserialize(pwd).then((wallet) => sdk.init(wallet));
    });
  };

  useEffect(() => {
    Login();
  }, []);

  useEffect(() => {
    // get args as string, convert object
    if (typeof getDataRef.current?.value === 'string') {
      const argObj = JSON.parse(getDataRef.current.value);
      // console.log('GOT PARAMS', argObj);

      // 주소 검사
      const argType = argObj.msgs[0].type;

      if (argType === '/vm.m_call') {
        setReqAddr(argObj.msgs[0].value.caller);
      } else if (argType === '/bank.MsgSend') {
        setReqAddr(argObj.msgs[0].value.from_address);
      }

      const baseFee = Number(argObj.fee.amount[0].amount);
      const toGNOT = baseFee / 1000000;

      const showFee = toGNOT.toString() + ' GNOT';

      setGasFee(showFee);

      // set origin
      setOrigin(argObj.origin);
    } else {
      //console.log('typeof', typeof getDataRef.current?.value);
    }
  });

  const showDetailText: string = showDetail
    ? 'Hide Transaction Details'
    : 'View Transaction Details';

  const { address, addrname, initialized } = useSdk();
  const openedDetails = useCallback(() => {
    if (!contentRef.current || !childRef.current) return;
    if (contentRef.current.clientHeight > 0) {
      contentRef.current.style.height = '0px';
    } else {
      contentRef.current.style.height = `${childRef.current.clientHeight}px`;
    }
    setShowDetail((prev: boolean) => !prev);
  }, [showDetail]);

  if (reqAddr !== undefined && reqAddr !== '' && sdk.address !== reqAddr) {
    // console.log('reqAddr', reqAddr);
    // console.log('sdk.address', sdk.address);

    chrome.runtime.sendMessage({
      type: 'RETURN_TX_RESULT',
      data: '2000',
      msg: `req: ${reqAddr} <-> adena: ${sdk.address}`,
    });
    window.close();
  } else {
    console.log('reqAddr', reqAddr);
    console.log('sdk.address', sdk.address);
  }

  const approveEvent = () => {
    if (initialized) {
      (async () => {
        const rtn = await sdk.gnoClient?.doContractMsg(
          JSON.parse(getDataRef.current?.value as string),
          sdk.address,
          sdk.getSigner(),
        );
        if (rtn === undefined) {
          // alert('fail transaction');
          await chrome.runtime.sendMessage({
            type: 'RETURN_TX_RESULT', // RETURN TX RESULT
            data: '6000', // failed
            msg: rtn,
          });
        } else {
          await chrome.runtime.sendMessage({
            type: 'RETURN_TX_RESULT',
            data: '7000', // success
            msg: rtn,
          });
        }
        window.close();
      })();
    } else {
      // console.log('no good');
      chrome.runtime.sendMessage({
        type: 'RETURN_TX_RESULT',
        data: '3000', // unknown error
      });
    }
  };

  const cancelEvent = async () => {
    console.log('SENDING');
    await chrome.runtime.sendMessage({
      type: 'RETURN_TX_RESULT',
      data: '5000', // user reject tx
    });
    console.log('5000');
    window.close();
  };

  return (
    <>
      {/*<input ref={getDataRef} id='atv_args' type='hidden' />*/}
      {/*<input id='atv_args' type='hidden' />*/}
      <dd id='atv_args' hidden={true} ref={getDataRef} />

      <Wrapper>
        <Typography type='header4'>Approve Transaction</Typography>
        {
          <>
            <img className='logo' src={gnotLogo} alt='gnoland-logo' />
            <RoundedBox>
              <Typography type='body2Reg' color={'#ffffff'}>
                {origin}
              </Typography>
            </RoundedBox>
            <BundleDataBox>
              <BundleDL>
                <dt>Contract</dt>
                <dd id='atv_contract'></dd>
              </BundleDL>
              <BundleDL>
                <dt>Function</dt>
                <dd id='atv_function'></dd>
              </BundleDL>
              {/*<BundleDL>*/}
              {/*  <dt>ARGS</dt>*/}
              {/*  <dd id='atv_args'></dd>*/}
              {/*</BundleDL>*/}
            </BundleDataBox>
            <RoundedDataBox>
              <RoundedDL>
                <dt>Network Fee:</dt>
                <dd>{gasFee}</dd>
              </RoundedDL>
            </RoundedDataBox>
          </>
        }
        <CancelAndConfirmButton
          cancelButtonProps={{ onClick: cancelEvent }}
          confirmButtonProps={{
            onClick: approveEvent,
            text: 'Approve',
          }}
        />
      </Wrapper>
    </>
  );
};
