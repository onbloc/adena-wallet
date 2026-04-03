import{j as x}from"./global-style-Be4sOX77.js";import{s as h}from"./encoding-util-0q6lHXNs.js";import{r as c,d as m}from"./theme-D2qI5cuM.js";const g=m.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`,b=m.div`
  position: relative;
  width: 100%;
  height: 40px;
  border-radius: 10px;
  border: 1px solid
    ${({blur:r,theme:i})=>r?i.webNeutral._800:i.webNeutral._600};
  box-shadow:
    0px 0px 0px 3px rgba(255, 255, 255, 0.04),
    0px 1px 3px 0px rgba(0, 0, 0, 0.1),
    0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  overflow: hidden;
`,n=185,t=40,s=40,v=({seedString:r,showBlur:i=!0})=>{const f=c.useRef([]),l=c.useMemo(()=>`${h(r)}`.split(" ").length,[r]);return c.useEffect(()=>{if(l===0)return;const a=window?.devicePixelRatio||1;`${h(r)}`.split(" ").forEach((d,u)=>{const o=f.current[u];if(!o)return;const e=o.getContext("2d");e&&(o.width=n,o.height=t,o.style.width=`${n}px`,o.style.height=`${t}px`,e.clearRect(0,0,n,t),e.fillStyle="#181b1f",e.beginPath(),e.roundRect(0,0,s,t),e.fill(),e.beginPath(),e.moveTo(s+1,0),e.lineTo(s+1,t),e.strokeStyle="#36383D",e.lineWidth=1,e.stroke(),i&&(e.filter="blur(4px)"),e.fillStyle="#808080",e.font="16px Inter",e.textAlign="center",e.textBaseline="middle",e.fillText(`${u+1}`,s/2,t/2,s),e.fillStyle="#FFFFFF",e.font="16px bold Inter",e.textAlign="left",e.fillText(d,s+12,t/2),e.filter="none",e.scale(a,a))})},[l,r,i,window?.devicePixelRatio]),x.jsx(g,{children:Array.from({length:l}).map((a,p)=>x.jsx(b,{blur:i,children:x.jsx("canvas",{ref:d=>f.current[p]=d,width:n,height:t})},p))})};v.__docgenInfo={description:"",methods:[],displayName:"WebSeedBox",props:{seedString:{required:!0,tsType:{name:"string"},description:""},showBlur:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}}}};export{v as W};
