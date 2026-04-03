import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u,v as d}from"./iframe-DekVl-_p.js";import{t as f}from"./atoms-DPNcwsZr.js";import{n as p,r as m}from"./base-D2xGt4mF.js";var h,g,_=t((()=>{f(),l(),a(),n(),h=i(m)`
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
      background-color: ${s(`neutral`,`_7`)};
    }
  }

  &.opened {
    .button-wrapper {
      background-color: ${s(`neutral`,`_7`)};
    }
  }

  .dropdown-static-wrapper {
    ${r.flex()}
    position: absolute;
    min-width: 146px;
    background-color: ${s(`neutral`,`_8`)};
    border: 1px solid ${s(`neutral`,`_7`)};
    border-radius: 12.5px;
    box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.2);
    z-index: 99;
    overflow: hidden;

    ${({position:e})=>e===`left`?d`
            left: -122px;
            top: 100%;
          `:``}
  }
`,g=i(p)`
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
    ${o.body3Reg}
  }

  & + & {
    border-top: 1px solid ${s(`neutral`,`_7`)};
  }

  &.selected {
    background-color: ${s(`neutral`,`_7`)};
  }

  &:hover {
    background-color: ${s(`neutral`,`_7`)};
  }
`})),v,y,b,x,S=t((()=>{v=e(c()),_(),y=u(),b=({buttonNode:e,options:t,hover:n})=>{let[r,i]=(0,v.useState)(!1),a=(0,v.useCallback)(()=>{n&&i(!0)},[n]),o=(0,v.useCallback)(()=>{i(!1)},[n]),s=(0,v.useCallback)(()=>{n||i(!0)},[n]),c=(0,v.useCallback)(e=>{e.onClick(),i(!1)},[]);return(0,y.jsxs)(h,{className:r?`opened`:``,position:`left`,onMouseOver:a,onMouseOut:o,onClick:s,children:[(0,y.jsx)(`div`,{className:`button-wrapper`,children:e}),r&&(0,y.jsx)(`div`,{className:r?`dropdown-static-wrapper active`:`dropdown-static-wrapper`,children:t.map((e,t)=>(0,y.jsx)(x,{text:e.text,icon:e.icon,onClick:()=>c(e)},t))})]})},x=({icon:e,text:t,onClick:n})=>(0,y.jsxs)(g,{onClick:n,children:[(0,y.jsx)(`div`,{className:`item-icon-wrapper`,children:!!e&&e}),(0,y.jsx)(`span`,{className:`title`,children:t})]}),b.__docgenInfo={description:``,methods:[],displayName:`OptionDropdown`,props:{buttonNode:{required:!0,tsType:{name:`ReactReactNode`,raw:`React.ReactNode`},description:``},options:{required:!0,tsType:{name:`Array`,elements:[{name:`OptionItem`}],raw:`OptionItem[]`},description:``},hover:{required:!1,tsType:{name:`boolean`},description:``}}}}));export{S as n,b as t};