import { CSSProperties } from 'react';
import { css, CSSProp } from 'styled-components';

export type MixinsType = {
  /**
   * @param direction flex-direction, default: column
   * @param align align-items, default: center
   * @param justify justify-content, default: center
   */
  flex: (props?: {
    direction?: CSSProperties['flexDirection'];
    align?: CSSProperties['alignItems'];
    justify?: CSSProperties['justifyContent'];
  }) => CSSProp;
  positionCenter: () => CSSProp;
  posTopCenterRight: (right?: string) => CSSProp;
  posTopCenterLeft: (left?: string) => CSSProp;
  posTopLeft: (top?: string) => CSSProp;
};

const mixins: MixinsType = {
  flex: (props) => css`
    display: flex;
    flex-direction: ${props?.direction || 'column'};
    align-items: ${props?.align || 'center'};
    justify-content: ${props?.justify || 'center'};
  `,
  positionCenter: () => css`
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  `,
  posTopCenterRight: (right = '0px') => css`
    position: absolute;
    top: 50%;
    right: ${right};
    transform: translateY(-50%);
  `,
  posTopCenterLeft: (left = '0px') => css`
    position: absolute;
    top: 50%;
    left: ${left};
    transform: translateY(-50%);
  `,
  posTopLeft: (top = '0px') => css`
    position: absolute;
    top: ${top};
    left: 0px;
  `,
} as const;

export default mixins;
