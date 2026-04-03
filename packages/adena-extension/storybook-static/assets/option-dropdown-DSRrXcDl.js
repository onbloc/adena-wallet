import{m as w,j as t}from"./global-style-Be4sOX77.js";import{g as o,l as h,d,f as b,r as p}from"./theme-D2qI5cuM.js";import"./index-Ct-w3XHB.js";import{V as f,R as g}from"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./index-BxhAeZbh.js";import"./index-CulhM7-u.js";import"./index-CpLq81TF.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-B3tmVslE.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";import"./index-jlviZXHb.js";const k=d(f)`
  position: relative;
  width: 24px;
  height: auto;

  .button-wrapper {
    display: flex;
    width: 24px;
    height: 24px;
    border-radius: 24px;
    justify-content: center;
    align-items: center;
    cursor: pointer;

    &:hover {
      background-color: ${o("neutral","_7")};
    }
  }

  &.opened {
    .button-wrapper {
      background-color: ${o("neutral","_7")};
    }
  }

  .dropdown-static-wrapper {
    ${w.flex()}
    position: absolute;
    min-width: 146px;
    background-color: ${o("neutral","_8")};
    border: 1px solid ${o("neutral","_7")};
    border-radius: 12.5px;
    box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.2);
    z-index: 99;
    overflow: hidden;

    ${({position:r})=>r==="left"?h`
            left: -122px;
            top: 100%;
          `:""}
  }
`,O=d(g)`
  width: 100%;
  height: 30px;
  padding: 7px 0 7px 12px;
  gap: 8px;
  justify-content: flex-start;
  align-items: center;
  transition: 0.2s;
  cursor: pointer;

  .item-icon-wrapper {
    display: block;
    width: 12px;
    height: 14px;

    & > svg {
      width: 12px;
      height: 12px;

      &.large {
        width: 14px;
        height: 14px;
      }
    }
  }

  & > .title {
    display: inline-flex;
    width: 100%;
    ${b.body3Reg}
  }

  & + & {
    border-top: 1px solid ${o("neutral","_7")};
  }

  &.selected {
    background-color: ${o("neutral","_7")};
  }

  &:hover {
    background-color: ${o("neutral","_7")};
  }
`,j=({buttonNode:r,options:s,hover:e})=>{const[a,n]=p.useState(!1),l=p.useCallback(()=>{e&&n(!0)},[e]),c=p.useCallback(()=>{n(!1)},[e]),u=p.useCallback(()=>{e||n(!0)},[e]),m=p.useCallback(i=>{i.onClick(),n(!1)},[]);return t.jsxs(k,{className:a?"opened":"",position:"left",onMouseOver:l,onMouseOut:c,onClick:u,children:[t.jsx("div",{className:"button-wrapper",children:r}),a&&t.jsx("div",{className:a?"dropdown-static-wrapper active":"dropdown-static-wrapper",children:s.map((i,x)=>t.jsx(y,{text:i.text,icon:i.icon,onClick:()=>m(i)},x))})]})},y=({icon:r,text:s,onClick:e})=>t.jsxs(O,{onClick:e,children:[t.jsx("div",{className:"item-icon-wrapper",children:!!r&&r}),t.jsx("span",{className:"title",children:s})]});j.__docgenInfo={description:"",methods:[],displayName:"OptionDropdown",props:{buttonNode:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},options:{required:!0,tsType:{name:"Array",elements:[{name:"OptionItem"}],raw:"OptionItem[]"},description:""},hover:{required:!1,tsType:{name:"boolean"},description:""}}};export{j as O};
