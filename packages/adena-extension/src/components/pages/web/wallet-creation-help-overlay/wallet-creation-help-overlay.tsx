import React, { useEffect, useMemo, useState, useCallback } from 'react';
import WebHelpOverlay, {
  OverlayItem,
} from '@components/molecules/web-help-overlay/web-help-overlay';
import { WalletCreationHelpOverlayItem } from './wallet-creation-help-overlay.styles';

export interface WalletCreationHelpOverlayProps {
  hardwareWalletButtonRef?: React.RefObject<HTMLButtonElement>;
  airgapAccountButtonRef?: React.RefObject<HTMLButtonElement>;
  multisigAccountButtonRef?: React.RefObject<HTMLButtonElement>;
  advancedOptionButtonRef?: React.RefObject<HTMLButtonElement>;
  onFinish: () => void;
}

interface TooltipConfig {
  securityRate: number;
  convenienceRate: number;
  content: React.ReactNode;
}

function getTooltipPositionY(
  y: number,
  height: number,
  windowHeight: number,
): {
  position: 'top' | 'bottom';
  height: number;
} {
  const positionY = y;
  const boxHeight = height;
  const tooltipHeight = 214;

  if (windowHeight === 0 || y + boxHeight + tooltipHeight < windowHeight) {
    return {
      position: 'bottom',
      height: positionY + boxHeight + 10,
    };
  }

  return {
    position: 'top',
    height: positionY - tooltipHeight - 10,
  };
}

const TOOLTIP_CONFIGS: Record<string, TooltipConfig> = {
  hardwareWallet: {
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
  airgapAccount: {
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
  multisigAccount: {
    securityRate: 3,
    convenienceRate: 1,
    content: (
      <WalletCreationHelpOverlayItem>
        This allows you to connect with the{' '}
        <b>
          multi-sig <br />
          accounts.
        </b>
      </WalletCreationHelpOverlayItem>
    ),
  },
  advancedOption: {
    securityRate: 1,
    convenienceRate: 3,
    content: (
      <WalletCreationHelpOverlayItem>
        This allows you to create or restore accounts
        <br />
        with <b>Seed Phrases</b>, <b>Private Key</b> or <b>Google Login</b>.
      </WalletCreationHelpOverlayItem>
    ),
  },
};

const WalletCreationHelpOverlay: React.FC<WalletCreationHelpOverlayProps> = ({
  hardwareWalletButtonRef,
  airgapAccountButtonRef,
  multisigAccountButtonRef,
  advancedOptionButtonRef,
  onFinish,
}) => {
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const createHelpItem = useCallback(
    (
      ref: React.RefObject<HTMLButtonElement> | undefined,
      config: TooltipConfig,
    ): OverlayItem | null => {
      if (!ref?.current) return null;

      const { x, y, width, height } = ref.current.getBoundingClientRect();
      const tooltipPositionInfo = getTooltipPositionY(y, height, windowSize.height);

      return {
        x: x + width / 2,
        y: tooltipPositionInfo.height,
        position: tooltipPositionInfo.position,
        tooltipInfo: config,
      };
    },
    [windowSize],
  );

  const helpItems = useMemo(() => {
    const items = [
      createHelpItem(hardwareWalletButtonRef, TOOLTIP_CONFIGS.hardwareWallet),
      createHelpItem(airgapAccountButtonRef, TOOLTIP_CONFIGS.airgapAccount),
      createHelpItem(multisigAccountButtonRef, TOOLTIP_CONFIGS.multisigAccount),
      createHelpItem(advancedOptionButtonRef, TOOLTIP_CONFIGS.advancedOption),
    ];

    return items.filter((item): item is OverlayItem => item !== null);
  }, [
    createHelpItem,
    hardwareWalletButtonRef,
    airgapAccountButtonRef,
    multisigAccountButtonRef,
    advancedOptionButtonRef,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = (): void => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <WebHelpOverlay items={helpItems} onFinish={onFinish} />;
};

export default WalletCreationHelpOverlay;
