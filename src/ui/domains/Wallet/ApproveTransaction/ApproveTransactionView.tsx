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

const dummy = {
  contract: 'vm.call',
  function: 'CreateBoard',
  networkFee: '0.000001',
  unit: 'GNOT',
};

export const ApproveTransactionView = () => {
  const sdk = useSdk();
  const navigate = useNavigate();
  const [isLogined, setIslogined] = useState(true);
  const [loading, setLoading] = useState(true);
  const getDataRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const childRef = useRef<HTMLDivElement>(null);
  const contractRef = useRef<HTMLInputElement>(null);
  const functionRef = useRef<HTMLInputElement>(null);
  const argsRef = useRef<HTMLTextAreaElement>(null);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [walletString, SetWalletString] = useState<string>();

  const Login = () => {
    getSavedPassword().then((pwd: string) => {
      walletDeserialize(pwd).then((wallet) => sdk.init(wallet));
    });
  };

  useEffect(() => {
    Login();
  }, []);

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

  const approveEvent = () => {
    // console.log(functionRef.current?.value);
    // console.log(contractRef.current?.value);
    // console.log(argsRef.current?.value);
    if (initialized) {
      (async () => {
        const rtn = await sdk.gnoClient?.doContractMsg(
          JSON.parse(getDataRef.current?.value as string),
          sdk.address,
          sdk.getSigner(),
        );
        if (rtn === undefined) {
          alert('fail transaction');
        } else {
          alert('success transaction');
        }
        window.close();
      })();
    } else {
      console.log('no good');
    }
  };

  const cancelEvent = () => {
    // console.log(sdk.address);
    // console.log(functionRef.current?.value);
    // console.log(contractRef.current?.value);
    // console.log(argsRef.current?.value);
    // console.log(sdk.getSigner());

    // const args_split = argsRef.current?.value.split(",");
    // const args = {
    //   bid: args_split?.at(0),
    //   title: args_split?.at(1),
    //   body: args_split?.at(2),
    // };

    // console.log(args);
    // console.log(JSON.parse(getDataRef.current?.value as string));

    //sdk.gnoClient?.doContract("createPost", args, sdk.address, sdk.getSigner());
    window.close();
  };

  return (
    <>
      <input ref={getDataRef} id='atv_args' type={'hidden'} />

      <Wrapper>
        <Typography type='header4'>Approve Transaction</Typography>
        {false ? (
          <ApproveTransactionLoading />
        ) : (
          <>
            <img className='logo' src={gnotLogo} alt='gnoland-logo' />
            <RoundedBox>
              <Typography type='body2Reg' color={'#ffffff'}>
                https://gno.land
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
            </BundleDataBox>
            <RoundedDataBox>
              <RoundedDL>
                <dt>Network Fee:</dt>
                <dd>{`${dummy.networkFee} ${dummy.unit}`}</dd>
              </RoundedDL>
            </RoundedDataBox>
          </>
        )}
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
