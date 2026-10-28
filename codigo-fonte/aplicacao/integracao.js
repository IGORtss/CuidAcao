
const parentOrigin = (()=>{try{return new URL(document.referrer).origin}catch{return location.origin}})();
window.addEventListener('message',event=>{
 if(event.source!==parent || event.origin!==parentOrigin || event.data?.type!=='cuidacao-preferences')return;
 document.documentElement.dataset.siteTheme=event.data.theme==='dark'?'dark':'light';
 document.documentElement.style.setProperty('--site-font-scale', String(Math.max(.9,Math.min(1.18,Number(event.data.scale)||1))));
});
if(parent!==window) parent.postMessage({type:'cuidacao-ready'},parentOrigin);
