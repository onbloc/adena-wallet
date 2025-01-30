import { useEffect, useRef } from 'react';
import styled from 'styled-components';

interface WebSeedBoxProps {
  seeds: string[];
  showBlur?: boolean;
}

const CanvasContainer = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const CanvasWrapper = styled.div<{ blur: boolean }>`
  position: relative;
  width: 100%;
  height: 40px;
  border-radius: 10px;
  border: 1px solid
    ${({ blur, theme }): string => (blur ? theme.webNeutral._800 : theme.webNeutral._600)};
  box-shadow:
    0px 0px 0px 3px rgba(255, 255, 255, 0.04),
    0px 1px 3px 0px rgba(0, 0, 0, 0.1),
    0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  overflow: hidden;
`;

const BOX_WIDTH = 185;
const BOX_HEIGHT = 40;
const NUMBER_BOX_WIDTH = 40;

export const WebSeedBox = ({ seeds, showBlur = true }: WebSeedBoxProps): JSX.Element => {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    const dpr = window?.devicePixelRatio || 1;

    seeds.forEach((seed, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = BOX_WIDTH;
      canvas.height = BOX_HEIGHT;
      canvas.style.width = `${BOX_WIDTH}px`;
      canvas.style.height = `${BOX_HEIGHT}px`;

      // Clear canvas
      ctx.clearRect(0, 0, BOX_WIDTH, BOX_HEIGHT);

      // Fill number box
      ctx.fillStyle = '#181b1f';
      ctx.beginPath();
      ctx.roundRect(0, 0, NUMBER_BOX_WIDTH, BOX_HEIGHT);
      ctx.fill();

      // Draw number box border
      ctx.beginPath();
      ctx.moveTo(NUMBER_BOX_WIDTH + 1, 0);
      ctx.lineTo(NUMBER_BOX_WIDTH + 1, BOX_HEIGHT);
      ctx.strokeStyle = '#36383D';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw seed box blur screen
      if (showBlur) {
        ctx.filter = 'blur(4px)';
      }

      // Write seed number text
      ctx.fillStyle = '#808080';
      ctx.font = '16px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${index + 1}`, NUMBER_BOX_WIDTH / 2, BOX_HEIGHT / 2, NUMBER_BOX_WIDTH);

      // Write seed text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '16px bold Inter';
      ctx.textAlign = 'left';
      ctx.fillText(seed, NUMBER_BOX_WIDTH + 12, BOX_HEIGHT / 2);

      ctx.filter = 'none';

      ctx.scale(dpr, dpr);
    });
  }, [seeds, showBlur, window?.devicePixelRatio]);

  return (
    <CanvasContainer>
      {seeds.map((_, index) => (
        <CanvasWrapper key={index} blur={showBlur}>
          <canvas
            ref={(el): HTMLCanvasElement | null => (canvasRefs.current[index] = el)}
            width={BOX_WIDTH}
            height={BOX_HEIGHT}
          />
        </CanvasWrapper>
      ))}
    </CanvasContainer>
  );
};
