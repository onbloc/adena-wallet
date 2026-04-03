import React, { useEffect } from 'react';

export const AppReloadFallback: React.FC = () => {
  useEffect(() => {
    location.reload();
  }, []);

  return <React.Fragment />;
};
