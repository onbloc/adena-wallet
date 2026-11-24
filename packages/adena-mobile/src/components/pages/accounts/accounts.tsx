import React, { ReactElement } from 'react';

import { AvatarColor } from '../../../domain/account';
import { formatAddress } from '../../../utils/address';
import { Avatar, Button, Icon } from '../../atoms';
import { ListRow, Screen, SectionLabel, TopBar } from '../../molecules';

export interface AccountListItem {
  id: string;
  name: string;
  address: string;
  sourceLabel: string;
  selected: boolean;
  avatarColor?: AvatarColor;
  avatarPhoto?: string;
}

export interface AccountsPageProps {
  accounts: AccountListItem[];
  adding: boolean;
  onSelect: (accountId: string) => void;
  onOpenAccountSettings: (accountId: string) => void;
  onAddAccount: () => void;
  onImportMnemonic: () => void;
  onImportPrivateKey: () => void;
  onBack: () => void;
}

export const AccountsPage = ({
  accounts,
  adding,
  onSelect,
  onOpenAccountSettings,
  onAddAccount,
  onImportMnemonic,
  onImportPrivateKey,
  onBack,
}: AccountsPageProps): ReactElement => (
  <Screen
    header={<TopBar title='Accounts' onBack={onBack} />}
    footer={<Button label='Add account' leadingIcon='plus' loading={adding} loadingLabel='Adding…' onPress={onAddAccount} testID='accounts-add' />}
  >
    <SectionLabel label={`${accounts.length} accounts`} />
    {accounts.map((account) => {
      const handlePress = (): void => (account.selected ? onOpenAccountSettings(account.id) : onSelect(account.id));

      return (
        <ListRow
          key={account.id}
          testID={`account-${account.id}`}
          leading={<Avatar name={account.name} color={account.avatarColor} imageUri={account.avatarPhoto} />}
          label={account.name}
          description={`${formatAddress(account.address)} · ${account.sourceLabel}`}
          trailing={account.selected ? <Icon name='check' size={20} /> : undefined}
          showChevron={false}
          onPress={handlePress}
        />
      );
    })}
    <SectionLabel label='Import' />
    <ListRow label='Import recovery phrase' leadingIcon='key' onPress={onImportMnemonic} />
    <ListRow label='Import private key' leadingIcon='lock' onPress={onImportPrivateKey} />
  </Screen>
);
