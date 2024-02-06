import React, { useState, useRef, useEffect, HTMLAttributes } from 'react';
import { AnimationConfigWithData, AnimationItem, default as LottieWeb } from 'lottie-web';
import styled from 'styled-components';

type LottieProps = {
  animationData: any;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
  isPaused?: boolean;
  isStopped?: boolean;
  width?: number;
  height?: number;
} & HTMLAttributes<HTMLDivElement>;

const StyledContainer = styled.div<any>`
  display: flex;
  
  & .lottie-player {
    width: ${({ width }): string => width ? `${width}px` : 'auto'} !important;
    height: ${({ height }): string => height ? `${height}px` : 'auto'} !important;
  }
`;

const Lottie: React.FC<LottieProps> = ({
  animationData,
  loop = true,
  autoplay = true,
  speed = 1,
  isPaused = false,
  isStopped = false,
  ...restProps
}) => {
  const animationContainer = useRef<HTMLDivElement>(null);
  const [animationInstance, setAnimationInstance] = useState<AnimationItem | null>(null);

  useEffect(() => {
    if (!animationContainer.current) {
      return;
    }
    const animationOptions: AnimationConfigWithData<'canvas'> = {
      container: animationContainer.current,
      renderer: 'canvas' as const,
      loop,
      autoplay,
      animationData,
      rendererSettings: {
        className: 'lottie-player',
      },
    };

    const animation = LottieWeb.loadAnimation<'canvas'>(animationOptions);
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

  return <StyledContainer
    ref={animationContainer}
    {...restProps}
  />;
};

export default Lottie;
