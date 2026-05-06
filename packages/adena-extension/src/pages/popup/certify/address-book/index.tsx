import React from 'react';
import styled, { useTheme } from 'styled-components';

import { Text, ListBox } from '@components/atoms';
import { CloseShadowButton } from '@components/molecules';
import plus from '@assets/plus.svg';
import { CHAIN_ICON_BY_GROUP } from '@assets/icons/cosmos-icons';
import { RoutePath } from '@types';
import { formatAddress, formatNickname } from '@common/utils/client-utils';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';
import { AddressBookItem } from '@repositories/wallet';
import { useAddressBook } from '@hooks/use-address-book';
import { useAdenaContext } from '@hooks/use-context';
import { inferChainGroup } from '@common/utils/address-chain';
import LoadingAddressBook from './loading-address-book';

type navigateStatus = 'add' | 'edit';

const AddressBook = (): JSX.Element => {
  const theme = useTheme();
  const { navigate, goBack } = useAppNavigate();
  const { loading, addressBook } = useAddressBook();
  const { chainRegistry } = useAdenaContext();
  const addAddressHandler = (status: navigateStatus, curr?: AddressBookItem): void =>
    navigate<RoutePath.AddAddress>(RoutePath.AddAddress, {
      state: {
        status,
        addressList: addressBook,
        curr,
      },
    });

  if (loading) {
    return <LoadingAddressBook />;
  }

  return (
    <Wrapper>
      <TopSection>
        <Text type='header4'>Address Book</Text>
        <AddButton onClick={(): void => addAddressHandler('add')} />
      </TopSection>
      <>
        {addressBook.length > 0 ? (
          addressBook.map((item, i) => {
            const chainGroup = inferChainGroup(item.address, chainRegistry);
            const chainIcon = CHAIN_ICON_BY_GROUP[chainGroup];
            return (
              <ListBox
                left={<Text type='body2Bold'>{formatNickname(item.name, 15)}</Text>}
                center={null}
                right={
                  <AddressRight>
                    {chainIcon && <img className='chain-icon' src={chainIcon} alt={chainGroup} />}
                    <Text type='body2Reg' color={theme.neutral.a}>
                      {formatAddress(item.address)}
                    </Text>
                  </AddressRight>
                }
                cursor='pointer'
                hoverAction={true}
                key={i}
                padding={'0 17px'}
                onClick={(): void => addAddressHandler('edit', item)}
              />
            );
          })
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

const AddressRight = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-end' })};
  gap: 6px;
  margin-left: auto;

  .chain-icon {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
  }
`;

export default AddressBook;
