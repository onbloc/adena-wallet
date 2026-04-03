import{N as r}from"./nft-collection-card-CIehPK1X.js";import"./global-style-Be4sOX77.js";import"./theme-D2qI5cuM.js";import"./index-BAMY2Nnw.js";import"./icon-pin-tRAZew7m.js";import"./nft-card-image-CwvWFIjY.js";import"./icon-empty-image-BxaLFB1D.js";import"./index-Ct-w3XHB.js";import"./index-CulhM7-u.js";import"./index-CLRA8FOO.js";import"./index-DrT1707K.js";import"./index-DjFTnIrN.js";import"./index-DacC881Y.js";import"./bignumber-B1z4pYDt.js";import"./index-BxhAeZbh.js";import"./index-CpLq81TF.js";import"./index-B3tmVslE.js";import"./index-jlviZXHb.js";import"./index-Bv2zqv-E.js";import"./index-g6zNktBg.js";import"./index-C6Pb5J-W.js";import"./index-C0j4FPrl.js";const{action:n}=__STORYBOOK_MODULE_ACTIONS__,I={title:"components/nft/NFTCollectionCard",component:r},e={args:{grc721Collection:{display:!0,name:"Gnopunks",networkId:"",packagePath:"package path",symbol:"",image:null,tokenId:"0",type:"grc721",isMetadata:!0,isTokenUri:!0},pin:n("pin"),unpin:n("pin"),exitsPinnedCollections:()=>!1,queryGRC721TokenUri:()=>({data:"https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg",isFetched:!0}),queryGRC721Balance:()=>({data:3})}},a={args:{grc721Collection:{display:!0,name:"Gnopunks",networkId:"",packagePath:"package path",symbol:"",image:null,tokenId:"0",type:"grc721",isMetadata:!0,isTokenUri:!0},pin:n("pin"),unpin:n("pin"),queryGRC721TokenUri:()=>({data:"https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg",isFetched:!1}),queryGRC721Balance:()=>({data:3})}},t={args:{grc721Collection:{display:!0,name:"Gnopunks",networkId:"",packagePath:"package path",symbol:"",image:null,tokenId:"0",type:"grc721",isMetadata:!0,isTokenUri:!0},pin:n("pin"),unpin:n("pin"),queryGRC721TokenUri:()=>({data:null,isFetched:!0}),queryGRC721Balance:()=>({data:3}),exitsPinnedCollections:()=>!1}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
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
}`,...e.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
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
}`,...a.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
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
}`,...t.parameters?.docs?.source}}};const q=["Default","Loading","EmptyImage"];export{e as Default,t as EmptyImage,a as Loading,q as __namedExportsOrder,I as default};
