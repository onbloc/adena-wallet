import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Text from '@components/text';
import theme from '@styles/theme';
import CloseShadowButton from '@components/buttons/close-shadow-button';
import plus from '../../../assets/plus.svg';
import ListBox from '@components/list-box';
import { RoutePath } from '@router/path';
import { useEffect } from 'react';
import { formatAddress, formatNickname } from '@common/utils/client-utils';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

type navigateStatus = 'add' | 'edit';

export interface BookListProps {
  id?: string;
  address: string;
  name: string;
  createdAt?: string;
}

const AddressBook = () => {
  const { addressBookService } = useAdenaContext();
  const navigate = useNavigate();
  const [datas, setDatas] = useState<any>([]);
  const { currentAccount } = useCurrentAccount();
  const addAddressHandler = (status: navigateStatus, curr?: BookListProps) =>
    navigate(RoutePath.AddAddress, {
      state: {
        status,
        curr: curr ?? null,
        datas: datas,
      },
    });

  useEffect(() => {
    (async () => {
      const addressList = await addressBookService.getAddressBookByAccountId(currentAccount?.id ?? '');
      setDatas(addressList);
    })();
  }, [currentAccount]);

  return (
    <Wrapper>
      <TopSection>
        <Text type='header4'>Address Book</Text>
        <AddButton onClick={() => addAddressHandler('add')} />
      </TopSection>
      <>
        {datas.length > 0 ? (
          datas.map((v: any, i: number) => (
            <ListBox
              left={<Text type='body2Bold'>{formatNickname(v.name, 15)}</Text>}
              center={null}
              right={
                <Text type='body2Reg' color={theme.color.neutral[9]} margin='0px 0px 0px auto'>
                  {formatAddress(v.address)}
                </Text>
              }
              cursor='pointer'
              hoverAction={true}
              key={i}
              padding={'0 17px'}
              onClick={() => addAddressHandler('edit', v)}
            />
          ))
        ) : (
          <Text className='desc' type='body1Reg' color={theme.color.neutral[9]}>
            No addresses to display
          </Text>
        )}
      </>
      <CloseShadowButton onClick={() => navigate(-1)} />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  padding-bottom: 120px;
  .desc {
    position: absolute;
    top: 210px;
    left: 0px;
    width: 100%;
    text-align: center;
  }
`;

const TopSection = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  margin-bottom: 12px;
`;

const AddButton = styled.button`
  width: 24px;
  height: 24px;
  background: url(${plus}) no-repeat center center / 100% 100%;
`;

export default AddressBook;
