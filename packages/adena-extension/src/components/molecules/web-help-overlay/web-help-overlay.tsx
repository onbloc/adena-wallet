import React, { useCallback, useState } from 'react';
import WebHelpTooltip from '../web-help-tooltip/web-help-tooltip';
import { WebHelpOverlayItemWrapper, WebHelpOverlayWrapper } from './web-help-overlay.styles';

export interface OverlayItem {
  x: number;
  y: number;
  tooltipInfo: {
    securityRate: number;
    convenienceRate: number;
    content: React.ReactNode;
  };
}

export interface WebHelpOverlayProps {
  items: OverlayItem[];
  onFinish: () => void;
}

const WebHelpOverlay: React.FC<WebHelpOverlayProps> = ({ items, onFinish }) => {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  const nextItem = useCallback(() => {
    const hasNext = currentItemIndex + 1 < items.length;
    if (!hasNext) {
      onFinish();
      return;
    }
    setCurrentItemIndex((prev) => prev + 1);
  }, [currentItemIndex, items]);

  return (
    <WebHelpOverlayWrapper>
      {items.map((item, index) =>
        index <= currentItemIndex ? (
          <WebHelpOverlayItemWrapper
            key={index}
            className={index === currentItemIndex ? 'visible' : ''}
            x={item.x}
            y={item.y}
          >
            <WebHelpTooltip
              securityRate={item.tooltipInfo.securityRate}
              convenienceRate={item.tooltipInfo.convenienceRate}
              confirm={nextItem}
            >
              {item.tooltipInfo.content}
            </WebHelpTooltip>
          </WebHelpOverlayItemWrapper>
        ) : (
          <React.Fragment key={index} />
        ),
      )}
    </WebHelpOverlayWrapper>
  );
};

export default WebHelpOverlay;
