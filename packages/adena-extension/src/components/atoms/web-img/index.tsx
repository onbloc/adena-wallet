import { ReactElement } from 'react';

type WebImgProps = {
  src: string;
  size?: number;
  width?: number;
  height?: number;
  color?: string;
};

const WebImg = ({ src, size, width = size, height = size }: WebImgProps): ReactElement => {
  return <img src={src} width={width} height={height} alt={src?.toString()} />;
};

export default WebImg;
