import React, { useCallback } from 'react';
import Portal from '@layouts/portal';
import { SideMenuBackground, SideMenuContent, SideMenuOverlay } from './side-menu-layout.styles';
import SideMenuContainer from './side-menu-container';

interface SideMenuLayoutProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selector?: string;
}

const SideMenuLayout: React.FC<SideMenuLayoutProps> = ({
  open,
  setOpen,
  selector = 'portal-root',
}) => {
  const onClickBackground = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  return (
    <Portal selector={selector}>
      <SideMenuOverlay open={open}>
        <SideMenuBackground onClick={onClickBackground} />
        <SideMenuContent open={open}>
          <SideMenuContainer open={open} setOpen={setOpen} />
        </SideMenuContent>
      </SideMenuOverlay>
    </Portal>
  );
};

export default SideMenuLayout;
