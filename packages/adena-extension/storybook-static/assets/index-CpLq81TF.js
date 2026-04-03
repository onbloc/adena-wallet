import{j as i}from"./global-style-Be4sOX77.js";import{l as n,d as o,g as l}from"./theme-D2qI5cuM.js";import{R as f,V as x}from"./index-CLRA8FOO.js";import{W as h}from"./index-B3tmVslE.js";import{W as m}from"./index-jlviZXHb.js";const y="data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20id='Chevron%20right'%20clip-path='url(%23clip0_7878_4032)'%3e%3cpath%20id='Vector'%20d='M9.29055%206.70978C8.90055%207.09978%208.90055%207.72978%209.29055%208.11978L13.1705%2011.9998L9.29055%2015.8798C8.90055%2016.2698%208.90055%2016.8998%209.29055%2017.2898C9.68055%2017.6798%2010.3105%2017.6798%2010.7005%2017.2898L15.2905%2012.6998C15.6805%2012.3098%2015.6805%2011.6798%2015.2905%2011.2898L10.7005%206.69978C10.3205%206.31978%209.68055%206.31978%209.29055%206.70978Z'%20fill='%23FAFCFF'/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='clip0_7878_4032'%3e%3crect%20width='24'%20height='24'%20fill='white'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e",p=o.button.withConfig({shouldForwardProp:e=>!["ref","size","fixed","rightIcon"].includes(e)})`
  & {
    cursor: pointer;
    border: none;
    border-radius: ${({size:e})=>e==="small"?"12px":"14px"};
    padding: ${({size:e})=>e==="large"?"12px 16px 16px":"8px 16px"};
    display: flex;
    flex-direction: row;
    width: ${({size:e})=>e==="full"?"100%":"auto"};
    height: 44px;
    justify-content: center;
    align-items: center;
    ${({fixed:e})=>e?n`
            flex-shrink: 0;
          `:""};

    &:disabled {
      cursor: default;
      opacity: 0.4;
    }
  }
`,w=o(p)`
  & {
    color: ${l("webNeutral","_100")};
    background: linear-gradient(180deg, #0059ff 0%, #004bd6 100%);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4) inset;

    ${({disabled:e})=>e?"":n`
            &:hover {
              box-shadow:
                0 0 0 2px rgba(255, 255, 255, 0.4) inset,
                0px 0px 24px 0px #0059ff52,
                0px 1px 3px 0px #0000001a,
                0px 1px 2px 0px #0000000f;
            }
            &:active {
              box-shadow:
                0 0 0 2px rgba(255, 255, 255, 0.4) inset,
                0px 0px 24px 0px #0059ff52,
                0px 0px 0px 3px #0059ff29,
                0px 1px 3px 0px #0000001a,
                0px 1px 2px 0px #0000000f;
            }
          `}
  }
`,v=o(p)`
  & {
    color: #adcaff;
    background: rgba(0, 89, 255, 0.16);
    box-shadow: 0 0 0 1px rgba(122, 169, 255, 0.24) inset;

    ${({disabled:e})=>e?"":n`
            &:hover {
              color: #adcaff;
              background: linear-gradient(
                180deg,
                rgba(0, 89, 255, 0.2) 0%,
                rgba(0, 89, 255, 0) 100%
              );
              box-shadow:
                0 0 0 2px rgba(122, 169, 255, 0.24) inset,
                0px 1px 3px 0px #0000001a,
                0px 1px 2px 0px #0000000f;
            }

            &:active {
              color: #7aa9ff;
              background:
                0 0 0 2px rgba(122, 169, 255, 0.24) inset,
                linear-gradient(180deg, rgba(0, 89, 255, 0.2) 0%, rgba(0, 89, 255, 0) 100%);
            }
          `}

    &:disabled {
      color: #7aa9ff;
      opacity: 0.4;
      background: rgba(0, 89, 255, 0.16);
    }
  }
`,d=o(p)`
  & {
    color: ${l("webNeutral","_300")};
    background: rgba(188, 197, 214, 0.04);
    box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.24) inset;

    svg * {
      fill: ${l("webNeutral","_300")};
    }

    ${({disabled:e,theme:a})=>e?"":n`
            &:hover {
              background: rgba(188, 197, 214, 0.06);
              box-shadow:
                0 0 0 2px rgba(188, 197, 214, 0.24) inset,
                0px 1px 3px 0px rgba(0, 0, 0, 0.1),
                0px 1px 2px 0px rgba(0, 0, 0, 0.06);
              svg * {
                fill: ${a.webNeutral._100};
              }
            }
            &:active {
              color: ${a.webNeutral._100};
              box-shadow:
                0 0 0 1px rgba(188, 197, 214, 0.24) inset,
                0px 0px 16px 0px rgba(255, 255, 255, 0.04),
                0px 0px 0px 4px rgba(255, 255, 255, 0.04),
                0px 1px 3px 0px rgba(0, 0, 0, 0.1),
                0px 1px 2px 0px rgba(0, 0, 0, 0.06);
              svg * {
                fill: ${a.webNeutral._100};
              }
            }
          `}
  }
`,k=o(d)`
  & {
    color: ${l("webNeutral","_300")};
    padding: 8px 36px;
    border-radius: 12px;
    border: 1px solid rgba(188, 197, 214, 0.16);
    background: rgba(188, 197, 214, 0.08);

    svg * {
      fill: ${l("webNeutral","_300")};
    }

    ${({disabled:e,theme:a})=>e?"":n`
            &:hover {
              color: ${a.webNeutral._100};
              box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.16) inset;
              background: rgba(188, 197, 214, 0.08);
              svg * {
                fill: ${a.webNeutral._100};
              }
            }
            &:active {
              color: ${a.webNeutral._100};
              box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.16) inset;
              svg * {
                fill: ${a.webNeutral._100};
              }
            }
          `}
  }
`,$=o(p)`
  & {
    outline: 1px solid rgba(188, 197, 214, 0.16);
    background: rgba(188, 197, 214, 0.04);
    border-radius: 8px;
    border: 1px solid #212429;

    &:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }

    &:active {
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
    }
  }
`,_=o(p)`
  & {
    color: #adcaff;
    outline: 1px solid #0a1b39;
    background: rgba(0, 89, 255, 0.05);
    border-radius: 8px;
    border: 1px solid #212429;

    &:hover {
      color: #adcaff;
      background: rgba(255, 255, 255, 0.08);
    }

    &:active {
      color: #adcaff;
      background: rgba(255, 255, 255, 0.08);
    }
  }
`,B=({buttonRef:e,figure:a,textType:c="title4",children:b,fixed:g,...r})=>{let t;switch(a){case"secondary":t=v;break;case"tertiary":r.size==="small"?t=k:t=d;break;case"quaternary":t=$;break;case"quinary":t=_;break;case"primary":default:t=w}const s="text"in r&&r.rightIcon==="chevronRight",u=g||r.size==="small";return i.jsx(t,{ref:e,fixed:u,...r,children:"text"in r?i.jsxs(f,{style:{gap:4,alignItems:"center",justifyContent:"space-between"},children:[s&&i.jsx(x,{style:{width:12}}),i.jsx(m,{type:c,color:"inherit",children:r.text}),s&&i.jsx(x,{style:{marginRight:4},children:i.jsx(h,{src:y,size:24})})]}):b})};B.__docgenInfo={description:"",methods:[],displayName:"WebButton",props:{buttonRef:{required:!1,tsType:{name:"ReactRefObject",raw:"React.RefObject<HTMLButtonElement>",elements:[{name:"HTMLButtonElement"}]},description:""},size:{required:!0,tsType:{name:"union",raw:"'full' | 'large' | 'small'",elements:[{name:"literal",value:"'full'"},{name:"literal",value:"'large'"},{name:"literal",value:"'small'"}]},description:""},textType:{required:!1,tsType:{name:"WebFontType"},description:"",defaultValue:{value:"'title4'",computed:!1}},figure:{required:!0,tsType:{name:"union",raw:"'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary'",elements:[{name:"literal",value:"'primary'"},{name:"literal",value:"'secondary'"},{name:"literal",value:"'tertiary'"},{name:"literal",value:"'quaternary'"},{name:"literal",value:"'quinary'"}]},description:""},fixed:{required:!1,tsType:{name:"boolean"},description:""}}};export{B as W};
