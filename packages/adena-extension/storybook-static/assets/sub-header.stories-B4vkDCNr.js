import{j as a}from"./global-style-Be4sOX77.js";import{S as s,A as o,a as l}from"./index-CulhM7-u.js";import"./theme-D2qI5cuM.js";import"./index-BAMY2Nnw.js";const{action:c}=__STORYBOOK_MODULE_ACTIONS__,p={title:"components/common/SubHeader",component:s},e={args:{title:"Send GNS"}},t={args:{title:"Send GNS",leftElement:{element:a.jsx("img",{src:`${l}`,alt:"arrow back"}),onClick:c("left element click")}}},r={args:{title:"Send GNS",rightElement:{element:a.jsx("img",{src:`${o}`,alt:"arrow next"}),onClick:c("right element click")}}},n={args:{title:"Send GNS",leftElement:{element:a.jsx("img",{src:`${l}`,alt:"arrow back"}),onClick:c("left element click")},rightElement:{element:a.jsx("img",{src:`${o}`,alt:"arrow next"}),onClick:c("right element click")}}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Send GNS'
  }
}`,...e.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Send GNS',
    leftElement: {
      element: <img src={\`\${ArrowBackIcon}\`} alt='arrow back' />,
      onClick: action('left element click')
    }
  }
}`,...t.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Send GNS',
    rightElement: {
      element: <img src={\`\${ArrowNextIcon}\`} alt='arrow next' />,
      onClick: action('right element click')
    }
  }
}`,...r.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    title: 'Send GNS',
    leftElement: {
      element: <img src={\`\${ArrowBackIcon}\`} alt='arrow back' />,
      onClick: action('left element click')
    },
    rightElement: {
      element: <img src={\`\${ArrowNextIcon}\`} alt='arrow next' />,
      onClick: action('right element click')
    }
  }
}`,...n.parameters?.docs?.source}}};const S=["Default","LeftElement","RightElement","LeftAndRightElement"];export{e as Default,n as LeftAndRightElement,t as LeftElement,r as RightElement,S as __namedExportsOrder,p as default};
