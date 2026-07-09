import React, { useEffect, useRef, useState } from 'react';

import IconHelp from '@assets/icon-help';
import {
  InfoTooltipContainer,
  InfoTooltipTooltipBoxWrapper,
  InfoTooltipVariant,
} from './info-tooltip.styles';

export interface InfoTooltipProps {
  content: React.ReactNode;
  iconColor?: string;
  // 'popover' matches the header hover popups; defaults to the original tooltip.
  variant?: InfoTooltipVariant;
}

interface TooltipPosition {
  left?: number;
  right?: number;
  top?: number;
  transform?: string;
}

interface ArrowPosition {
  left: string;
  transform: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, iconColor, variant = 'default' }) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({});
  const [arrowPosition, setArrowPosition] = useState<ArrowPosition>({
    left: '50%',
    transform: 'translateX(-50%)',
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTooltipOpen && containerRef.current && tooltipRef.current) {
      calculateTooltipPosition();
    }
  }, [isTooltipOpen]);

  const calculateTooltipPosition = (): void => {
    if (!containerRef.current || !tooltipRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // The popover variant matches Figma: a 320px box centered on the screen
    // (symmetric side margins) with the caret offset to point at the icon. The
    // default variant centers the box on the icon instead.
    const tooltipWidth = variant === 'popover' ? 320 : 300;
    const margin = 8;
    const containerCenterX = containerRect.left + containerRect.width / 2;
    const containerTop = containerRect.top;

    let leftPosition =
      variant === 'popover'
        ? (viewportWidth - tooltipWidth) / 2
        : containerCenterX - tooltipWidth / 2;

    const containerRelativeToTooltip = containerCenterX - leftPosition;
    let arrowLeft = (containerRelativeToTooltip / tooltipWidth) * 100;

    if (leftPosition < margin) {
      leftPosition = margin;
      const containerRelativeToNewTooltip = containerCenterX - leftPosition;
      arrowLeft = (containerRelativeToNewTooltip / tooltipWidth) * 100;
    } else if (leftPosition + tooltipWidth > viewportWidth - margin) {
      leftPosition = viewportWidth - tooltipWidth - margin;

      const containerRelativeToNewTooltip = containerCenterX - leftPosition;
      arrowLeft = (containerRelativeToNewTooltip / tooltipWidth) * 100;
    }

    // Ensure arrow doesn't go too far to the edges (keep it within reasonable bounds)
    arrowLeft = Math.max(8, Math.min(92, arrowLeft));

    setTooltipPosition({
      left: leftPosition,
      top: containerTop - 14, // 14px gap above container
      transform: 'translateY(-100%)', // Move tooltip above its natural position
    });

    setArrowPosition({
      left: `${arrowLeft}%`,
      transform: 'translateX(-50%)',
    });
  };

  return (
    <InfoTooltipContainer
      ref={containerRef}
      onMouseOver={(): void => setIsTooltipOpen(true)}
      onMouseLeave={(): void => setIsTooltipOpen(false)}
    >
      <IconHelp color={iconColor} />
      {isTooltipOpen && (
        <InfoTooltipTooltipBoxWrapper
          ref={tooltipRef}
          $position={tooltipPosition}
          $arrowPosition={arrowPosition}
          $variant={variant}
        >
          {content}
        </InfoTooltipTooltipBoxWrapper>
      )}
    </InfoTooltipContainer>
  );
};

export default InfoTooltip;
