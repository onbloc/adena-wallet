import{c as e,i as t}from"./_polyfill-node.global-CL4hvcq6.js";import{_ as n,c as r,g as i,i as a,n as o,r as s,rt as c,s as l,t as u}from"./iframe-DekVl-_p.js";import{i as d,r as f}from"./highlight-number-BlZTVJlg.js";import{s as p,t as m}from"./atoms-DPNcwsZr.js";import{r as h}from"./base-D2xGt4mF.js";import{n as g,t as _}from"./nft-card-image-KqCZlPkl.js";import{n as v,t as y}from"./icon-pin-CkqbYZgZ.js";var b,x=t((()=>{m(),l(),a(),n(),b=i(h)`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;

  .info-static-wrapper {
    ${r.flex({direction:`row`,align:`center`,justify:`space-between`})}
    position: absolute;
    top: 10px;
    width: 132px;
    flex-shrink: 0;
    height: 20px;
    padding: 0 5px 0 8px;
    gap: 4px;
    flex-shrink: 0;
    align-self: center;
    border-radius: 10px;
    background-color: ${s(`neutral`,`_9`)};
    cursor: default;

    .pin-wrapper {
      ${r.flex({direction:`column`,align:`center`,justify:`center`})}
      width: 10px;
      height: 10px;
      cursor: pointer;

      .icon-pin {
        path {
          transition: 0.2s;
          fill: ${s(`neutral`,`_5`)};
        }

        &:hover,
        &.pinned.pinned {
          path {
            fill: ${s(`neutral`,`_1`)};
          }
        }
      }
    }

    .name-wrapper {
      display: inline-block;
      width: 100%;
      ${o.captionBold}
      text-align: center;
      word-break: break-all;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .balance-wrapper {
      ${r.flex({direction:`column`,align:`flex-end`,justify:`flex-end`})}
      width: auto;
      flex-shrink: 0;
      color: ${s(`neutral`,`a`)};
      ${o.light1Bold};
    }
  }
`,i(h)`
  width: 100%;
  height: 100%;
  background-color: ${s(`neutral`,`_7`)};
  align-items: center;
  justify-content: center;

  .empty-image {
    width: 31px;
    height: auto;
  }

  .nft-image {
    width: auto;
    height: auto;
    min-width: 100%;
    min-height: 100%;
    object-fit: cover;
  }
`,i(p)`
  ${r.flex({align:`flex-end`,justify:`space-between`})}
  width: 100%;
  flex: 1;
  height: 100%;
  padding: 10px;
`})),S,C,w,T=t((()=>{v(),g(),d(),S=e(c()),x(),C=u(),w=({grc721Collection:e,exitsPinnedCollections:t,pin:n,unpin:r,queryGRC721TokenUri:i,queryGRC721Balance:a,moveCollectionPage:o})=>{let{data:s,isFetched:c}=i(e.packagePath,e.tokenId,{enabled:e.isTokenUri}),{data:l}=a(e.packagePath,{refetchOnMount:!0}),u=(0,S.useMemo)(()=>e.isTokenUri?c:!0,[e,c]),d=(0,S.useMemo)(()=>`${e.name}`,[e.name]),p=(0,S.useMemo)(()=>l==null?``:f(l).toFormat(),[l]),m=(0,S.useMemo)(()=>t(e),[e,t]),h=(0,S.useCallback)(t=>{if(t.preventDefault(),t.stopPropagation(),m){r(e);return}n(e)},[m,n,r]);return(0,C.jsxs)(b,{onClick:(0,S.useCallback)(()=>{o(e)},[e,o]),children:[(0,C.jsx)(_,{image:s,isFetched:u,hasBadge:!0}),(0,C.jsxs)(`div`,{className:`info-static-wrapper`,onClick:e=>{e.preventDefault(),e.stopPropagation()},children:[(0,C.jsx)(`div`,{className:`pin-wrapper`,onClick:h,children:(0,C.jsx)(y,{className:m?`icon-pin pinned`:`icon-pin`})}),(0,C.jsx)(`div`,{className:`name-wrapper`,children:d}),(0,C.jsx)(`div`,{className:`balance-wrapper`,children:p})]})]})},w.__docgenInfo={description:``,methods:[],displayName:`NFTCollectionCard`,props:{grc721Collection:{required:!0,tsType:{name:`GRC721CollectionModel`},description:``},exitsPinnedCollections:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(collection: GRC721CollectionModel) => boolean`,signature:{arguments:[{type:{name:`GRC721CollectionModel`},name:`collection`}],return:{name:`boolean`}}},description:``},queryGRC721TokenUri:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  tokenId: string,
  options?: Omit<UseQueryOptions<string | null, Error>, 'queryKey' | 'queryFn'>,
) => UseQueryResult<string | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`string`},name:`tokenId`},{type:{name:`Omit`,elements:[{name:`UseQueryOptions`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<string | null, Error>`},{name:`union`,raw:`'queryKey' | 'queryFn'`,elements:[{name:`literal`,value:`'queryKey'`},{name:`literal`,value:`'queryFn'`}]}],raw:`Omit<UseQueryOptions<string | null, Error>, 'queryKey' | 'queryFn'>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`string | null`,elements:[{name:`string`},{name:`null`}]}],raw:`UseQueryResult<string | null>`}}},description:``},queryGRC721Balance:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(
  packagePath: string,
  options?: Omit<UseQueryOptions<number | null, Error>, 'queryKey' | 'queryFn'>,
) => UseQueryResult<number | null>`,signature:{arguments:[{type:{name:`string`},name:`packagePath`},{type:{name:`Omit`,elements:[{name:`UseQueryOptions`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]},{name:`Error`}],raw:`UseQueryOptions<number | null, Error>`},{name:`union`,raw:`'queryKey' | 'queryFn'`,elements:[{name:`literal`,value:`'queryKey'`},{name:`literal`,value:`'queryFn'`}]}],raw:`Omit<UseQueryOptions<number | null, Error>, 'queryKey' | 'queryFn'>`},name:`options`}],return:{name:`UseQueryResult`,elements:[{name:`union`,raw:`number | null`,elements:[{name:`number`},{name:`null`}]}],raw:`UseQueryResult<number | null>`}}},description:``},pin:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(collection: GRC721CollectionModel) => void`,signature:{arguments:[{type:{name:`GRC721CollectionModel`},name:`collection`}],return:{name:`void`}}},description:``},unpin:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(collection: GRC721CollectionModel) => void`,signature:{arguments:[{type:{name:`GRC721CollectionModel`},name:`collection`}],return:{name:`void`}}},description:``},moveCollectionPage:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(collection: GRC721CollectionModel) => void`,signature:{arguments:[{type:{name:`GRC721CollectionModel`},name:`collection`}],return:{name:`void`}}},description:``}}}}));export{T as n,w as t};