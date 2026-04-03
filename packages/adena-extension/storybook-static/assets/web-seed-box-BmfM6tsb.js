import{n as e,o as t}from"./chunk-zsgVPwQN.js";import{_ as n,g as r,rt as i,t as a}from"./iframe-BclzClxJ.js";import{n as o,t as s}from"./encoding-util-4L8qDxO1.js";var c,l,u,d,f,p,m,h,g=e((()=>{s(),c=t(i()),n(),l=a(),u=r.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`,d=r.div`
  position: relative;
  width: 100%;
  height: 40px;
  border-radius: 10px;
  border: 1px solid
    ${({blur:e,theme:t})=>e?t.webNeutral._800:t.webNeutral._600};
  box-shadow:
    0px 0px 0px 3px rgba(255, 255, 255, 0.04),
    0px 1px 3px 0px rgba(0, 0, 0, 0.1),
    0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  overflow: hidden;
`,f=185,p=40,m=40,h=({seedString:e,showBlur:t=!0})=>{let n=(0,c.useRef)([]),r=(0,c.useMemo)(()=>`${o(e)}`.split(` `).length,[e]);return(0,c.useEffect)(()=>{if(r===0)return;let i=window?.devicePixelRatio||1;`${o(e)}`.split(` `).forEach((e,r)=>{let a=n.current[r];if(!a)return;let o=a.getContext(`2d`);o&&(a.width=f,a.height=p,a.style.width=`${f}px`,a.style.height=`${p}px`,o.clearRect(0,0,f,p),o.fillStyle=`#181b1f`,o.beginPath(),o.roundRect(0,0,m,p),o.fill(),o.beginPath(),o.moveTo(m+1,0),o.lineTo(m+1,p),o.strokeStyle=`#36383D`,o.lineWidth=1,o.stroke(),t&&(o.filter=`blur(4px)`),o.fillStyle=`#808080`,o.font=`16px Inter`,o.textAlign=`center`,o.textBaseline=`middle`,o.fillText(`${r+1}`,m/2,p/2,m),o.fillStyle=`#FFFFFF`,o.font=`16px bold Inter`,o.textAlign=`left`,o.fillText(e,m+12,p/2),o.filter=`none`,o.scale(i,i))})},[r,e,t,window?.devicePixelRatio]),(0,l.jsx)(u,{children:Array.from({length:r}).map((e,r)=>(0,l.jsx)(d,{blur:t,children:(0,l.jsx)(`canvas`,{ref:e=>n.current[r]=e,width:f,height:p})},r))})},h.__docgenInfo={description:``,methods:[],displayName:`WebSeedBox`,props:{seedString:{required:!0,tsType:{name:`string`},description:``},showBlur:{required:!1,tsType:{name:`boolean`},description:``,defaultValue:{value:`true`,computed:!1}}}}}));export{g as n,h as t};