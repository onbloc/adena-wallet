import{m as n,j as e}from"./global-style-Be4sOX77.js";import{f as o,g as a,d as s}from"./theme-D2qI5cuM.js";const u="data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M16%204L7%2012L16%2020'%20stroke='white'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'/%3e%3c/svg%3e",m="data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cpath%20d='M8%2020L17%2012L8%204'%20stroke='white'%20strokeWidth='2'%20strokeLinecap='round'%20strokeLinejoin='round'/%3e%3c/svg%3e",d=s.div`
  ${n.flex({direction:"row"})};
  position: relative;
  width: 100%;

  .icon-dropdown {
    path {
      fill: ${a("neutral","a")};
    }
  }

  .icon-wrapper {
    position: absolute;
    display: flex;
    width: 24px;
    height: 24px;
    cursor: pointer;
    justify-content: center;
    align-items: center;

    & > * {
      width: 100%;
      height: 100%;
    }

    &.left {
      left: 0;
    }

    &.right {
      right: 0;
    }
  }

  .title-wrapper {
    max-width: calc(100% - 48px - 24px);
    text-overflow: ellipsis;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    ${o.header4}
  }
`,l=({title:r,leftElement:t,rightElement:i})=>e.jsxs(d,{children:[t&&e.jsx("div",{className:"icon-wrapper left",onClick:t.onClick,children:t.element}),e.jsx("h4",{className:"title-wrapper",children:r}),i&&e.jsx("div",{className:"icon-wrapper right",onClick:i.onClick,children:i.element})]});l.__docgenInfo={description:"",methods:[],displayName:"SubHeader",props:{title:{required:!0,tsType:{name:"string"},description:""},leftElement:{required:!1,tsType:{name:"signature",type:"object",raw:`{
  element: ReactNode
  onClick: () => void
}`,signature:{properties:[{key:"element",value:{name:"ReactNode",required:!0}},{key:"onClick",value:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}},required:!0}}]}},description:""},rightElement:{required:!1,tsType:{name:"signature",type:"object",raw:`{
  element: ReactNode
  onClick: () => void
}`,signature:{properties:[{key:"element",value:{name:"ReactNode",required:!0}},{key:"onClick",value:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}},required:!0}}]}},description:""}}};export{m as A,l as S,u as a};
