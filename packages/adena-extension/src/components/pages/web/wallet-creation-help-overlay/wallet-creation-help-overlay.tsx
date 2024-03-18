import React, { useEffect, useMemo, useState } from 'react';
import WebHelpOverlay, {
  OverlayItem,
} from '@components/molecules/web-help-overlay/web-help-overlay';
import { WalletCreationHelpOverlayItem } from './wallet-creation-help-overlay.styles';

export interface WalletCreationHelpOverlayProps {
  init: boolean;
  hardwareWalletButtonRef?: React.RefObject<HTMLButtonElement>;
  airgapAccountButtonRef?: React.RefObject<HTMLButtonElement>;
  advancedOptionButtonRef?: React.RefObject<HTMLButtonElement>;
  onFinish: () => void;
}

const WalletCreationHelpOverlay: React.FC<WalletCreationHelpOverlayProps> = ({
  init,
  hardwareWalletButtonRef,
  airgapAccountButtonRef,
  advancedOptionButtonRef,
  onFinish,
}) => {
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const hardwareWalletHelpItem: OverlayItem | null = useMemo(() => {
    if (!hardwareWalletButtonRef?.current) return null;
    const { x, y, width, height } = hardwareWalletButtonRef.current.getBoundingClientRect();
    return {
      x: x + width / 2,
      y: y + height + 10,
      tooltipInfo: {
        securityRate: 2,
        convenienceRate: 2,
        content: (
          <WalletCreationHelpOverlayItem>
            This allows you to connect with accounts
            <br />
            from <b>hardware wallets</b>.
          </WalletCreationHelpOverlayItem>
        ),
      },
    };
  }, [hardwareWalletButtonRef?.current, windowSize]);

  const airgapAccountHelpItem: OverlayItem | null = useMemo(() => {
    if (!airgapAccountButtonRef?.current) return null;
    const { x, y, width, height } = airgapAccountButtonRef.current.getBoundingClientRect();
    return {
      x: x + width / 2,
      y: y + height + 10,
      tooltipInfo: {
        securityRate: 3,
        convenienceRate: 1,
        content: (
          <WalletCreationHelpOverlayItem>
            This allows you to connect with accounts
            <br />
            from an <b>air-gapped environment</b>.
          </WalletCreationHelpOverlayItem>
        ),
      },
    };
  }, [airgapAccountButtonRef?.current, windowSize]);

  const advancedOptionHelpItem: OverlayItem | null = useMemo(() => {
    if (!advancedOptionButtonRef?.current) return null;
    const { x, y, width, height } = advancedOptionButtonRef.current.getBoundingClientRect();
    return {
      x: x + width / 2,
      y: y + height + 10,
      tooltipInfo: {
        securityRate: 1,
        convenienceRate: 3,
        content: (
          <WalletCreationHelpOverlayItem>
            This allows you to create or restore accounts
            <br /> with <b>Seed Phrases</b>, <b>Private Key</b> or <b>Google Login</b>.
          </WalletCreationHelpOverlayItem>
        ),
      },
    };
  }, [advancedOptionButtonRef?.current, windowSize]);

  const helpItems = useMemo(() => {
    const items = [hardwareWalletHelpItem, airgapAccountHelpItem, advancedOptionHelpItem];
    if (!init || items.includes(null)) {
      return [];
    }
    return items as OverlayItem[];
  }, [init, hardwareWalletHelpItem, airgapAccountHelpItem, advancedOptionHelpItem]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleResize = (): void => {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };
      window.addEventListener('resize', handleResize);
      handleResize();
      return () => window.removeEventListener('resize', handleResize);
    } else {
      return () =>
        window.removeEventListener('resize', () => {
          return null;
        });
    }
  }, []);

  if (!init) {
    return <></>;
  }

  return <WebHelpOverlay items={helpItems} onFinish={onFinish} />;
};

export default WalletCreationHelpOverlay;
