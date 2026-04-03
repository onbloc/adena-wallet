import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-BclzClxJ.js";import{t as d}from"./atoms-kch4SvDy.js";import{t as f}from"./search-input-BwTkZbyX.js";import{i as p,n as m,r as h,t as g}from"./common-arrow-up-gray-DJG-E46C.js";import{n as _,t as v}from"./additional-token-search-list-PwSvjxdr.js";var y,b=e((()=>{l(),a(),n(),y=i.div`
  ${r.flex({align:`normal`,justify:`normal`})};
  position: relative;
  width: 100%;
  height: 48px;

  .fixed-wrapper {
    ${r.flex({align:`normal`,justify:`normal`})};
    position: relative;
    width: 100%;
    height: auto;
    min-height: 48px;
    border-radius: 30px;
    border: 1px solid ${s(`neutral`,`_7`)};
    background-color: ${s(`neutral`,`_9`)};
    overflow: hidden;
    z-index: 2;

    &.opened {
      position: absolute;
      border-radius: 18px;
      margin-bottom: 48px;
    }
  }

  .select-box {
    display: flex;
    width: 100%;
    height: 48px;
    padding: 13px;
    cursor: pointer;
    user-select: none;

    .title {
      width: calc(100% - 20px);
      padding: 0 4px;
      ${o.body2Reg};
      color: ${s(`neutral`,`a`)};
    }

    .icon-wrapper {
      display: flex;
      width: 20px;
      height: 20px;
    }

    &.selected {
      display: flex;
      width: 100%;
      justify-content: space-between;

      .title {
        display: flex;
        color: ${s(`neutral`,`_1`)};

        .name {
          display: block;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .symbol {
          display: flex;
          padding-left: 2px;
        }
      }
    }
  }

  .list-wrapper {
    .search-input-wrapper {
      height: 48px;
      padding: 4px 5px;
      border-top: 1px solid ${s(`neutral`,`_7`)};

      & > * {
        background-color: ${s(`neutral`,`_7`)};
      }
    }
  }
`})),x,S,C,w=e((()=>{p(),m(),d(),_(),x=t(c()),b(),S=u(),C=({opened:e,keyword:t,tokenInfos:n,selected:r,selectedInfo:i,onChangeKeyword:a,onClickOpenButton:o,onClickListItem:s})=>{let c=(0,x.useMemo)(()=>{let e=i?.name;return!r||!e?``:e},[r,i]),l=(0,x.useMemo)(()=>{let e=i?.symbol;return!r||!e?``:e.length>5?`(${e.slice(0,5)}...)`:`(${e})`},[r,i]);return(0,S.jsx)(y,{children:(0,S.jsxs)(`div`,{className:e?`fixed-wrapper opened`:`fixed-wrapper`,onClick:e=>e.stopPropagation(),children:[(0,S.jsxs)(`div`,{className:r?`select-box selected`:`select-box`,onClick:()=>o(!e),children:[r?(0,S.jsxs)(`span`,{className:`title`,children:[(0,S.jsx)(`span`,{className:`name`,children:c}),(0,S.jsx)(`span`,{className:`symbol`,children:l})]}):(0,S.jsx)(`span`,{className:`title`,children:`Select a GRC20 Token`}),(0,S.jsx)(`span`,{className:`icon-wrapper`,children:e?(0,S.jsx)(`img`,{src:`${g}`,alt:`select box opened icon`}):(0,S.jsx)(`img`,{src:`${h}`,alt:`select box unopened icon`})})]}),e&&(0,S.jsxs)(`div`,{className:`list-wrapper`,children:[(0,S.jsx)(`div`,{className:`search-input-wrapper`,children:(0,S.jsx)(f,{keyword:t,onChangeKeyword:a})}),(0,S.jsx)(v,{tokenInfos:n,onClickListItem:s})]})]})})},C.__docgenInfo={description:``,methods:[],displayName:`AdditionalTokenSelectBox`}}));export{w as n,C as t};