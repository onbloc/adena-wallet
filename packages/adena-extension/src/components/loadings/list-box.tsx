import React, { CSSProperties } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { Circle, Round } from '@components/loadings';

type RenderPageType = 'list-type' | 'card-type';

interface ListBoxProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  type?: RenderPageType;
}

const pulseKeyframe = keyframes`
  to {
		background-position: right -160px top 0;
	}
`;

const SkeletonBox = styled.div<ListBoxProps>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'flex-start')};
  width: ${({ width }) => width && width};
  height: ${({ height }) => height && height};
  background-color: ${({ theme }) => theme.color.neutral[6]};
  background-image: linear-gradient(
    270deg,
    rgba(82, 82, 107, 0) 0%,
    rgba(123, 123, 152, 0.32) 48.44%,
    rgba(82, 82, 107, 0) 100%
  );
  background-size: 150px 100%;
  background-repeat: no-repeat;
  background-position: left -160px top 0;
  animation: ${pulseKeyframe} 1.2s ease infinite;
  ${({ type, theme }) =>
    type === 'list-type'
      ? css`
          border-radius: 18px;
          padding: 0px 17px 0px 14px;
          margin-top: 31px;
          & + & {
            margin-top: 12px;
          }
        `
      : css`
          ${theme.mixins.flexbox('column', 'flex-end', 'space-between')}
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 16px;
          :nth-child(odd) {
            margin-right: 16px;
          }
        `}
`;

const RoundsBox = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-end', 'center')};
  margin-left: auto;
`;

export const ListBox = ({ type }: ListBoxProps) => {
  return (
    <>
      {type === 'list-type' && (
        <SkeletonBox width='100%' height='60px' type={type}>
          <Circle width='34px' height='34px' margin='0px 15px 0px 0px' />
          <Round width='91px' height='10px' radius='24px' />
          <RoundsBox>
            <Round width='100px' height='10px' radius='24px' />
            <Round width='58px' height='10px' radius='24px' margin='10px 0px 0px' />
          </RoundsBox>
        </SkeletonBox>
      )}
      {type === 'card-type' && (
        <SkeletonBox width='152px' height='152px' type={type}>
          <Round width='100%' height='20px' radius='10px' />
          <Circle width='20px' height='20px' />
        </SkeletonBox>
      )}
    </>
  );
};
