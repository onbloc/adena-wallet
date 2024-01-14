import { Route, Routes } from 'react-router-dom';

import { RoutePath } from '@types';

import LandingScreen from '@pages/web/landing-screen';
import ConnectLedgerDeviceScreen from '@pages/web/connect-ledger-device-screen';
import Header from './Header';

export const WebRouter = (): JSX.Element => {
  return (
    <>
      <Header />
      <Routes>
        <Route path={RoutePath.Home} element={<LandingScreen />} />
        <Route
          path={RoutePath.WebConnectLedgerDeviceScreen}
          element={<ConnectLedgerDeviceScreen />}
        />
      </Routes>
    </>
  );
};
