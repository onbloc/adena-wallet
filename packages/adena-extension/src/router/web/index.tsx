import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { RoutePath } from '@types';

import LandingScreen from '@pages/web/landing-screen';
import ConnectLedgerDeviceScreen from '@pages/web/connect-ledger-device-screen';

export const WebRouter = (): JSX.Element => {
  return (
    <Routes>
      <Route path={RoutePath.Home} element={<LandingScreen />} />
      <Route
        path={RoutePath.WebConnectLedgerDeviceScreen}
        element={<ConnectLedgerDeviceScreen />}
      />
    </Routes>
  );
};
