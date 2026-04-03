import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as t,b as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-DekVl-_p.js";import{h as d,t as f}from"./atoms-DPNcwsZr.js";var p,m,h=e((()=>{l(),a(),t(),p=i.div`
  ${r.flex({align:`normal`,justify:`normal`})};
  width: 100%;
  height: auto;
  background-color: ${s(`neutral`,`_9`)};

  .no-address-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 13px 16px;
  }
`,m=i.div`
  ${r.flex({direction:`row`,justify:`space-between`})};
  width: 100%;
  min-height: 48px;
  padding: 13px 16px;
  ${o.body2Reg};
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${s(`neutral`,`_7`)};
  }

  .name {
    font-weight: 600;
  }

  .address {
    color: ${s(`neutral`,`a`)};
  }
`})),g,_,v,y=e((()=>{f(),c(),t(),h(),g=u(),_=({addressBookId:e,name:t,address:n,onClickItem:r})=>(0,g.jsxs)(m,{onClick:()=>r(e),children:[(0,g.jsx)(`div`,{className:`name`,children:t}),(0,g.jsx)(`div`,{className:`address`,children:n})]}),v=({addressBookInfos:e,onClickItem:t})=>{let r=n();return(0,g.jsxs)(p,{children:[e.length===0&&(0,g.jsx)(`div`,{className:`no-address-wrapper`,children:(0,g.jsx)(d,{className:`no-address`,type:`body2Reg`,color:r.neutral.a,children:`No address registered`})}),e.map((e,n)=>(0,g.jsx)(_,{addressBookId:e.addressBookId,address:e.description,name:e.name,onClickItem:t},n))]})},v.__docgenInfo={description:``,methods:[],displayName:`AddressBookList`,props:{addressBookInfos:{required:!0,tsType:{name:`Array`,elements:[{name:`signature`,type:`object`,raw:`{
  addressBookId: string
  name: string
  description: string
}`,signature:{properties:[{key:`addressBookId`,value:{name:`string`,required:!0}},{key:`name`,value:{name:`string`,required:!0}},{key:`description`,value:{name:`string`,required:!0}}]}}],raw:`{
  addressBookId: string
  name: string
  description: string
}[]`},description:``},onClickItem:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(addressBookId: string) => void`,signature:{arguments:[{type:{name:`string`},name:`addressBookId`}],return:{name:`void`}}},description:``}}}}));export{y as n,v as t};