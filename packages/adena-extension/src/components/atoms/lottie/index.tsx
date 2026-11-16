import { AnimationConfigWithData, AnimationItem, default as LottieWeb } from 'lottie-web';
import React, { HTMLAttributes, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css, RuleSet } from 'styled-components';

type LottieProps = {
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  isPaused?: boolean;
  isStopped?: boolean;
  width?: number;
  height?: number;
  visibleSize?: number;
} & HTMLAttributes<HTMLDivElement>;

const StyledContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['visibleSize', 'isOverflow'].includes(prop),
})<{
  width?: number;
  height?: number;
  visibleSize: number;
  isOverflow: boolean;
}>`
  display: flex;
  position: relative;
  width: ${({ width }): string => (width ? `${width}px` : 'auto')};
  height: ${({ height }): string => (height ? `${height}px` : 'auto')};

  ${({ isOverflow, visibleSize, width, height }): RuleSet =>
    isOverflow
      ? css`
          & .lottie-player {
            display: flex;
            position: absolute;
            width: auto !important;
            height: ${`${visibleSize}px`} !important;
            left: 0;
            bottom: 0;
          }
        `
      : css`
          & .lottie-player {
            width: ${width ? `${width}px` : 'auto'} !important;
            height: ${height ? `${height}px` : 'auto'} !important;
          }
        `}
`;

const Lottie: React.FC<LottieProps> = ({
  animationData,
  loop = true,
  autoplay = true,
  speed = 1,
  isPaused = false,
  isStopped = false,
  visibleSize,
  ...restProps
}) => {
  const animationContainer = useRef<HTMLDivElement>(null);
  const [animationInstance, setAnimationInstance] = useState<AnimationItem | null>(null);

  const isOverflow = useMemo(() => {
    if (!visibleSize) {
      return false;
    }
    return true;
  }, [visibleSize]);

  useEffect(() => {
    if (!animationContainer.current) {
      return;
    }
    const animationOptions: AnimationConfigWithData<'svg'> = {
      container: animationContainer.current,
      renderer: 'svg' as const,
      loop,
      autoplay,
      animationData,
      rendererSettings: {
        className: 'lottie-player',
      },
    };

    const animation = LottieWeb.loadAnimation<'svg'>(animationOptions);
    setAnimationInstance(animation);

    return () => {
      animation.destroy();
    };
  }, [animationContainer.current, animationData, loop, autoplay]);

  useEffect(() => {
    if (animationInstance !== null) {
      if (isPaused) {
        animationInstance.pause();
      } else {
        animationInstance.play();
      }

      if (isStopped) {
        animationInstance.stop();
      }

      if (speed !== undefined) {
        animationInstance.setSpeed(speed);
      }
    }
  }, [isPaused, isStopped, speed, animationInstance]);

  return (
    <StyledContainer
      ref={animationContainer}
      isOverflow={isOverflow}
      visibleSize={visibleSize || 0}
      {...restProps}
    />
  );
};

export default Lottie;
