import React from 'react';

import { TransactionProgressLoading } from '../broadcast-transaction-screen/loading';

const SignTransactionLoading: React.FC = () => (
  <TransactionProgressLoading
    title='Signing...'
    description={'Your transaction is being signed.\nPlease wait a moment.'}
  />
);

export default SignTransactionLoading;
