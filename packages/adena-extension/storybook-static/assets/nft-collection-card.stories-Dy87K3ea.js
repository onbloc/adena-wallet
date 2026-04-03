import{i as e}from"./_polyfill-node.global-CL4hvcq6.js";import{n as t,t as n}from"./nft-collection-card-LbSPPJi8.js";var r,i,a,o,s,c;e((()=>{t(),{action:r}=__STORYBOOK_MODULE_ACTIONS__,i={title:`components/nft/NFTCollectionCard`,component:n},a={args:{grc721Collection:{display:!0,name:`Gnopunks`,networkId:``,packagePath:`package path`,symbol:``,image:null,tokenId:`0`,type:`grc721`,isMetadata:!0,isTokenUri:!0},pin:r(`pin`),unpin:r(`pin`),exitsPinnedCollections:()=>!1,queryGRC721TokenUri:()=>({data:`https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg`,isFetched:!0}),queryGRC721Balance:()=>({data:3})}},o={args:{grc721Collection:{display:!0,name:`Gnopunks`,networkId:``,packagePath:`package path`,symbol:``,image:null,tokenId:`0`,type:`grc721`,isMetadata:!0,isTokenUri:!0},pin:r(`pin`),unpin:r(`pin`),queryGRC721TokenUri:()=>({data:`https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg`,isFetched:!1}),queryGRC721Balance:()=>({data:3})}},s={args:{grc721Collection:{display:!0,name:`Gnopunks`,networkId:``,packagePath:`package path`,symbol:``,image:null,tokenId:`0`,type:`grc721`,isMetadata:!0,isTokenUri:!0},pin:r(`pin`),unpin:r(`pin`),queryGRC721TokenUri:()=>({data:null,isFetched:!0}),queryGRC721Balance:()=>({data:3}),exitsPinnedCollections:()=>!1}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    grc721Collection: {
      display: true,
      name: 'Gnopunks',
      networkId: '',
      packagePath: 'package path',
      symbol: '',
      image: null,
      tokenId: '0',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true
    },
    pin: action('pin'),
    unpin: action('pin'),
    exitsPinnedCollections: () => false,
    queryGRC721TokenUri: () => ({
      data: 'https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg',
      isFetched: true
    }) as unknown as UseQueryResult<string | null>,
    queryGRC721Balance: () => ({
      data: 3
    }) as unknown as UseQueryResult<number | null>
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    grc721Collection: {
      display: true,
      name: 'Gnopunks',
      networkId: '',
      packagePath: 'package path',
      symbol: '',
      image: null,
      tokenId: '0',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true
    },
    pin: action('pin'),
    unpin: action('pin'),
    queryGRC721TokenUri: () => ({
      data: 'https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg',
      isFetched: false
    }) as unknown as UseQueryResult<string | null>,
    queryGRC721Balance: () => ({
      data: 3
    }) as unknown as UseQueryResult<number | null>
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    grc721Collection: {
      display: true,
      name: 'Gnopunks',
      networkId: '',
      packagePath: 'package path',
      symbol: '',
      image: null,
      tokenId: '0',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true
    },
    pin: action('pin'),
    unpin: action('pin'),
    queryGRC721TokenUri: () => ({
      data: null,
      isFetched: true
    }) as unknown as UseQueryResult<string | null>,
    queryGRC721Balance: () => ({
      data: 3
    }) as unknown as UseQueryResult<number | null>,
    exitsPinnedCollections: () => false
  }
}`,...s.parameters?.docs?.source}}},c=[`Default`,`Loading`,`EmptyImage`]}))();export{a as Default,s as EmptyImage,o as Loading,c as __namedExportsOrder,i as default};