const mixins = {
  flexbox: (direction = 'row', align = 'center', justify = 'center') => `
    display: flex;
    flex-direction: ${direction};
    align-items: ${align};
    justify-content: ${justify};
  `,
  positionCenter: (type = 'absolute') => {
    if (type === 'absolute' || type === 'fixed')
      return `
        position: ${type};
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      `;
    return;
  },
  posTopCenterRight: (right = '0px') => {
    return `
      position: absolute;
      top: 50%;
      right: ${right};
      transform: translateY(-50%);
    `;
  },
  posTopCenterLeft: (left = '0px') => {
    return `
      position: absolute;
      top: 50%;
      left: ${left};
      transform: translateY(-50%);
    `;
  },
};

export default mixins;
