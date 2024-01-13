import React, { useState, useEffect } from 'react';
import styled, { useTheme } from 'styled-components';

import { Text, ListBox } from '@components/atoms';
import { CloseShadowButton } from '@components/molecules';
import plus from '@assets/plus.svg';
import { RoutePath } from '@types';
import { formatAddress, formatNickname } from '@common/utils/client-utils';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';
import { AddressBookItem } from '@repositories/wallet';

type navigateStatus = 'add' | 'edit';

const AddressBook = (): JSX.Element => {
  const theme = useTheme();
  const { addressBookService } = useAdenaContext();
  const { navigate, goBack } = useAppNavigate();
  const [addressList, setAddressList] = useState<AddressBookItem[]>([]);
  const { currentAccount } = useCurrentAccount();
  const addAddressHandler = (status: navigateStatus, curr?: AddressBookItem): void =>
    navigate<RoutePath.AddAddress>(RoutePath.AddAddress, {
      state: {
        status,
        addressList,
        curr,
      },
    });

  useEffect(() => {
    (async (): Promise<void> => {
      const _addressList = await addressBookService.getAddressBook();
      setAddressList(_addressList);
    })();
  }, [currentAccount]);

  return (
    <Wrapper>
      <TopSection>
        <Text type='header4'>Address Book</Text>
        <AddButton onClick={(): void => addAddressHandler('add')} />
      </TopSection>
      <>
        {addressList.length > 0 ? (
          addressList.map((v: any, i: number) => (
            <ListBox
              left={<Text type='body2Bold'>{formatNickname(v.name, 15)}</Text>}
              center={null}
              right={
                <Text type='body2Reg' color={theme.neutral.a} margin='0px 0px 0px auto'>
                  {formatAddress(v.address)}
                </Text>
              }
              cursor='pointer'
              hoverAction={true}
              key={i}
              padding={'0 17px'}
              onClick={(): void => addAddressHandler('edit', v)}
            />
          ))
        ) : (
          <Text className='desc' type='body1Reg' color={theme.neutral.a}>
            No addresses to display
          </Text>
        )}
      </>
      <CloseShadowButton onClick={goBack} />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
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
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  margin-bottom: 12px;
`;

const AddButton = styled.button`
  width: 24px;
  height: 24px;
  background: url(${plus}) no-repeat center center / 100% 100%;
`;

export default AddressBook;
