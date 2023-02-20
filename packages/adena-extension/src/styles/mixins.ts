import { css, CSSProp } from 'styled-components';

type MixinsKeyType = 'flexbox' | 'positionCenter' | 'posTopCenterRight' | 'posTopCenterLeft' | 'posTopLeft';

export type MixinsType = {
  [key in MixinsKeyType]: (...p: any[]) => CSSProp;
};

const mixins: MixinsType = {
  flexbox: (direction = 'row', align = 'center', justify = 'center', display = true) => css`
    display: ${display ? 'flex' : 'inline-flex'};
    flex-direction: ${direction};
    align-items: ${align};
    justify-content: ${justify};
  `,
  positionCenter: () => {
    return css`
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    `;
  },
  posTopCenterRight: (right = '0px') => {
    return css`
      position: absolute;
      top: 50%;
      right: ${right};
      transform: translateY(-50%);
    `;
  },
  posTopCenterLeft: (left = '0px') => {
    return css`
      position: absolute;
      top: 50%;
      left: ${left};
      transform: translateY(-50%);
    `;
  },
  posTopLeft: (top = '0px') => {
    return css`
      position: absolute;
      top: ${top};
      left: 0px;
    `;
  },
} as const;

export default mixins;
