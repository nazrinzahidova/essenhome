(() => {
  'use strict';
  if (window.EssenAnalytics) return;
  const endpoint='/api/analytics/events', pendingKey='essen:analytics-pending:v1', checkoutKey='essen:analytics-checkout:v1';
  const read=key=>{try{return JSON.parse(sessionStorage.getItem(key));}catch{return null;}};
  const write=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value));}catch{}};
  const disabled=()=>navigator.doNotTrack==='1'||/(?:^|;\s*)eh_analytics_off=1(?:;|$)/.test(document.cookie);
  const pageProduct=()=>{
    const value=Number(document.querySelector('meta[name="product-id"]')?.content || (/\/(?:ru\/)?product\.html$/.test(location.pathname)?new URLSearchParams(location.search).get('id'):null));
    return Number.isInteger(value)&&value>0?value:null;
  };
  const source=()=>{
    const path=location.pathname;
    if(pageProduct())return 'product';
    if(/\/vakansiyalar(?:[/.]|$)/.test(path))return 'vacancies';
    if(path.includes('korporativ-satislar'))return 'corporate';
    if(path.includes('topdan-satislar'))return 'wholesale';
    for(const name of ['catalog','cart','favourites'])if(path.endsWith('/'+name+'.html'))return name;
    return path==='/'||path==='/ru/'||path.endsWith('/index.html')?'home':'other';
  };
  let pending=(read(pendingKey)||[]);if(!Array.isArray(pending))pending=[];
  pending=pending.filter(item=>item&&item.at>Date.now()-1800000).slice(-50);
  const inflight=new Set();
  function send(entry){
    if(disabled()||inflight.has(entry.event.id))return;
    inflight.add(entry.event.id);
    fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry.event),keepalive:true}).then(response=>{
      if(response.ok||[400,403,429].includes(response.status)){pending=pending.filter(item=>item.event.id!==entry.event.id);write(pendingKey,pending);}
    }).catch(()=>{}).finally(()=>inflight.delete(entry.event.id));
  }
  function track(kind,details={},id){
    try{
      if(disabled())return;
      const event={id:id||crypto.randomUUID(),kind,source:source(),productId:details.productId??pageProduct(),...(kind==='add_to_cart'?{quantity:details.quantity||1}:{})};
      const entry={event,at:Date.now()};pending=pending.filter(item=>item.event.id!==event.id).slice(-49);pending.push(entry);write(pendingKey,pending);send(entry);
    }catch{/* Measurement must never interrupt shopping. */}
  }
  function beginCheckout(items){
    try{
      if(!Array.isArray(items)||!items.length)return;
      const signature=items.map(item=>[Number(item.productId||item.id),Number(item.quantity||item.qty||1)]).sort((a,b)=>a[0]-b[0]).map(pair=>pair.join(':')).join(',');
      const saved=read(checkoutKey),now=Date.now();
      const current=saved?.signature===signature&&saved.at>now-1800000?saved:{signature,id:crypto.randomUUID(),at:now};
      write(checkoutKey,current);track('begin_checkout',{productId:null},current.id);
    }catch{}
  }
  function checkoutComplete(){try{sessionStorage.removeItem(checkoutKey);}catch{}}
  function whatsapp(event){
    if(event.defaultPrevented||(event.type==='auxclick'?event.button!==1:event.button!==0))return;
    const link=event.target.closest?.('a[href]');if(!link)return;
    try{const url=new URL(link.href,location.href);if((url.protocol==='https:'&&['wa.me','api.whatsapp.com','web.whatsapp.com'].includes(url.hostname))||url.protocol==='whatsapp:')track('whatsapp_click');}catch{}
  }
  document.addEventListener('click',whatsapp);
  document.addEventListener('auxclick',whatsapp);
  window.EssenAnalytics={track,beginCheckout,checkoutComplete};
  const flush=()=>{if(disabled()){pending=[];write(pendingKey,pending);return;}pending.filter(item=>item.at>Date.now()-1800000).forEach(send);};
  window.addEventListener('online',flush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')flush();});flush();
})();
