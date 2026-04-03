import{n as e}from"./chunk-zsgVPwQN.js";import{_ as t,g as n,i as r,r as i,rt as a,t as o,v as s}from"./iframe-BclzClxJ.js";import{i as c,n as l,r as u}from"./base-Cfud_vLb.js";import{n as d,t as f}from"./web-img-D8LTiWQ_.js";import{n as p,t as m}from"./web-text-Bx7m5W80.js";var h=e((()=>{})),g,_,v,y,b,x,S,C,w,T=e((()=>{h(),r(),a(),t(),c(),d(),p(),g=o(),_=n.button.withConfig({shouldForwardProp:e=>![`ref`,`size`,`fixed`,`rightIcon`].includes(e)})`
  & {
    cursor: pointer;
    border: none;
    border-radius: ${({size:e})=>e===`small`?`12px`:`14px`};
    padding: ${({size:e})=>e===`large`?`12px 16px 16px`:`8px 16px`};
    display: flex;
    flex-direction: row;
    width: ${({size:e})=>e===`full`?`100%`:`auto`};
    height: 44px;
    justify-content: center;
    align-items: center;
    ${({fixed:e})=>e?s`
            flex-shrink: 0;
          `:``};

    &:disabled {
      cursor: default;
      opacity: 0.4;
    }
  }
`,v=n(_)`
  & {
    color: ${i(`webNeutral`,`_100`)};
    background: linear-gradient(180deg, #0059ff 0%, #004bd6 100%);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.4) inset;

    ${({disabled:e})=>e?``:s`
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
`,y=n(_)`
  & {
    color: #adcaff;
    background: rgba(0, 89, 255, 0.16);
    box-shadow: 0 0 0 1px rgba(122, 169, 255, 0.24) inset;

    ${({disabled:e})=>e?``:s`
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
`,b=n(_)`
  & {
    color: ${i(`webNeutral`,`_300`)};
    background: rgba(188, 197, 214, 0.04);
    box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.24) inset;

    svg * {
      fill: ${i(`webNeutral`,`_300`)};
    }

    ${({disabled:e,theme:t})=>e?``:s`
            &:hover {
              background: rgba(188, 197, 214, 0.06);
              box-shadow:
                0 0 0 2px rgba(188, 197, 214, 0.24) inset,
                0px 1px 3px 0px rgba(0, 0, 0, 0.1),
                0px 1px 2px 0px rgba(0, 0, 0, 0.06);
              svg * {
                fill: ${t.webNeutral._100};
              }
            }
            &:active {
              color: ${t.webNeutral._100};
              box-shadow:
                0 0 0 1px rgba(188, 197, 214, 0.24) inset,
                0px 0px 16px 0px rgba(255, 255, 255, 0.04),
                0px 0px 0px 4px rgba(255, 255, 255, 0.04),
                0px 1px 3px 0px rgba(0, 0, 0, 0.1),
                0px 1px 2px 0px rgba(0, 0, 0, 0.06);
              svg * {
                fill: ${t.webNeutral._100};
              }
            }
          `}
  }
`,x=n(b)`
  & {
    color: ${i(`webNeutral`,`_300`)};
    padding: 8px 36px;
    border-radius: 12px;
    border: 1px solid rgba(188, 197, 214, 0.16);
    background: rgba(188, 197, 214, 0.08);

    svg * {
      fill: ${i(`webNeutral`,`_300`)};
    }

    ${({disabled:e,theme:t})=>e?``:s`
            &:hover {
              color: ${t.webNeutral._100};
              box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.16) inset;
              background: rgba(188, 197, 214, 0.08);
              svg * {
                fill: ${t.webNeutral._100};
              }
            }
            &:active {
              color: ${t.webNeutral._100};
              box-shadow: 0 0 0 1px rgba(188, 197, 214, 0.16) inset;
              svg * {
                fill: ${t.webNeutral._100};
              }
            }
          `}
  }
`,S=n(_)`
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
`,C=n(_)`
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
`,w=({buttonRef:e,figure:t,textType:n=`title4`,children:r,fixed:i,...a})=>{let o;switch(t){case`secondary`:o=y;break;case`tertiary`:o=a.size===`small`?x:b;break;case`quaternary`:o=S;break;case`quinary`:o=C;break;default:o=v}let s=`text`in a&&a.rightIcon===`chevronRight`,c=i||a.size===`small`;return(0,g.jsx)(o,{ref:e,fixed:c,...a,children:`text`in a?(0,g.jsxs)(l,{style:{gap:4,alignItems:`center`,justifyContent:`space-between`},children:[s&&(0,g.jsx)(u,{style:{width:12}}),(0,g.jsx)(m,{type:n,color:`inherit`,children:a.text}),s&&(0,g.jsx)(u,{style:{marginRight:4},children:(0,g.jsx)(f,{src:`data:image/svg+xml,%3csvg%20width='24'%20height='24'%20viewBox='0%200%2024%2024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3e%3cg%20id='Chevron%20right'%20clip-path='url(%23clip0_7878_4032)'%3e%3cpath%20id='Vector'%20d='M9.29055%206.70978C8.90055%207.09978%208.90055%207.72978%209.29055%208.11978L13.1705%2011.9998L9.29055%2015.8798C8.90055%2016.2698%208.90055%2016.8998%209.29055%2017.2898C9.68055%2017.6798%2010.3105%2017.6798%2010.7005%2017.2898L15.2905%2012.6998C15.6805%2012.3098%2015.6805%2011.6798%2015.2905%2011.2898L10.7005%206.69978C10.3205%206.31978%209.68055%206.31978%209.29055%206.70978Z'%20fill='%23FAFCFF'/%3e%3c/g%3e%3cdefs%3e%3cclipPath%20id='clip0_7878_4032'%3e%3crect%20width='24'%20height='24'%20fill='white'/%3e%3c/clipPath%3e%3c/defs%3e%3c/svg%3e`,size:24})})]}):r})},w.__docgenInfo={description:``,methods:[],displayName:`WebButton`,props:{buttonRef:{required:!1,tsType:{name:`ReactRefObject`,raw:`React.RefObject<HTMLButtonElement>`,elements:[{name:`HTMLButtonElement`}]},description:``},size:{required:!0,tsType:{name:`union`,raw:`'full' | 'large' | 'small'`,elements:[{name:`literal`,value:`'full'`},{name:`literal`,value:`'large'`},{name:`literal`,value:`'small'`}]},description:``},textType:{required:!1,tsType:{name:`WebFontType`},description:``,defaultValue:{value:`'title4'`,computed:!1}},figure:{required:!0,tsType:{name:`union`,raw:`'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary'`,elements:[{name:`literal`,value:`'primary'`},{name:`literal`,value:`'secondary'`},{name:`literal`,value:`'tertiary'`},{name:`literal`,value:`'quaternary'`},{name:`literal`,value:`'quinary'`}]},description:``},fixed:{required:!1,tsType:{name:`boolean`},description:``}}}}));export{T as n,w as t};