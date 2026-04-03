import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-DekVl-_p.js";import{r as d,t as f}from"./string-utils-CW3p0bnP.js";var p,m,h=t((()=>{l(),a(),n(),p=i.div`
  ${r.flex({align:`normal`,justify:`normal`})};
  width: 100%;
  height: auto;
  max-height: 240px;

  .scroll-wrapper {
    ${r.flex({align:`normal`,justify:`normal`})};
    width: 100%;
    overflow-y: auto;
  }

  .no-content {
    display: flex;
    width: 100%;
    margin: 40px auto 180px auto;
    color: ${s(`neutral`,`a`)};
    ${o.body1Reg};
    justify-content: center;
    align-items: center;
  }
`,m=i.div`
  ${r.flex({direction:`row`,align:`normal`,justify:`space-between`})};
  width: 100%;
  height: auto;
  padding: 14px 15px;
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${s(`neutral`,`_7`)};
  }

  .title {
    display: flex;
    flex-shrink: 0;
    max-width: calc(100% - 140px);
    color: ${s(`neutral`,`_1`)};
    ${o.body2Reg};

    .name {
      display: inline-block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 3px;
    }

    .symbol {
      display: inline-block;
      width: fit-content;
    }
  }

  .path {
    display: inline-block;
    flex-shrink: 0;
    max-width: 140px;
    color: ${s(`neutral`,`a`)};
    ${o.body2Reg}
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`})),g,_,v,y,b=t((()=>{f(),g=e(c()),h(),_=u(),v=({tokenId:e,name:t,symbol:n,path:r,onClickListItem:i})=>{let a=(0,g.useMemo)(()=>n.length>5?`${n.substring(0,5)}...`:n,[n]),o=(0,g.useMemo)(()=>d(r||``),[r]);return(0,_.jsxs)(m,{onClick:()=>i(e),children:[(0,_.jsxs)(`span`,{className:`title`,children:[(0,_.jsx)(`span`,{className:`name`,children:t}),(0,_.jsx)(`span`,{className:`symbol`,children:`(${a})`})]}),(0,_.jsx)(`span`,{className:`path`,children:o})]})},y=({tokenInfos:e,onClickListItem:t})=>(0,_.jsx)(p,{children:(0,_.jsx)(`div`,{className:`scroll-wrapper`,children:e.length===0?(0,_.jsx)(`span`,{className:`no-content`,children:`No Tokens to Search`}):e.map((e,n)=>(0,_.jsx)(v,{tokenId:e.tokenId,symbol:e.symbol,name:e.name,path:e.pathInfo,onClickListItem:t},n))})}),y.__docgenInfo={description:``,methods:[],displayName:`AdditionalTokenSearchList`,props:{tokenInfos:{required:!0,tsType:{name:`Array`,elements:[{name:`TokenInfo`}],raw:`TokenInfo[]`},description:``},onClickListItem:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(tokenId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`tokenId`}],return:{name:`void`}}},description:``}}}}));export{b as n,y as t};