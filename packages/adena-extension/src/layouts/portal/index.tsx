import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  selector: string;
}

const Portal: React.FC<PortalProps> = ({ children, selector }) => {
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setElement(document.getElementById(selector ?? 'portal-root'));
  }, [selector]);

  return <>{element ? createPortal(children, element) : null}</>;
};

export default Portal;
