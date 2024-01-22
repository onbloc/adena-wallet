import { ReactElement } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import { RoutePath } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';

const WalletCreateScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();

  return (
    <WebMain>
      <WebMainHeader
        length={5}
        onClickGoBack={(): void => {
          navigate(RoutePath.WebAdvancedOption);
        }}
        step={0}
      />
    </WebMain>
  );
};

export default WalletCreateScreen;
