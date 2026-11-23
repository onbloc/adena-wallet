import React, { createContext, PropsWithChildren, ReactElement, use } from 'react';

import { AppContainer } from './container';

const ContainerContext = createContext<AppContainer | null>(null);

export const ContainerProvider = ({ container, children }: PropsWithChildren<{ container: AppContainer }>): ReactElement => (
  <ContainerContext value={container}>{children}</ContainerContext>
);

// Screen containers only; UI components must receive data and callbacks via props.
export const useContainer = (): AppContainer => {
  const container = use(ContainerContext);

  if (!container) {
    throw new Error('useContainer must be used inside ContainerProvider');
  }

  return container;
};
