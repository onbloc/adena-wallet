import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  selector: string;
}

export const Portal: React.FC<PortalProps> = ({ children, selector }) => {
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setElement(document.getElementById(selector ?? 'portal-root'));
  }, [selector]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <>{element ? createPortal(children as any, element) : null}</>;
};
