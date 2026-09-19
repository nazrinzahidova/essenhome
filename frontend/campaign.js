(() => {
  'use strict';
  const source = new URLSearchParams(location.search).get('campaign');
  const token = () => localStorage.getItem('token');
  let scanToken = null, campaign = null, ready = null;
  const panel = document.createElement('dialog');
  panel.id = 'qr-campaign-panel';
  panel.innerHTML = `<form method="dialog"><button class="qr-close" aria-label="Bağla">×</button></form><h2>Şansını aktivləşdir!</h2><div id="qr-content"></div><p id="qr-message" role="status" aria-live="polite"></p>`;
  document.body.append(panel);
  const style=document.createElement('style');
  style.textContent=`#qr-campaign-panel{margin:auto;border:1px solid #eee;border-radius:16px;padding:28px;width:min(440px,calc(100% - 32px));font:14px Poppins,sans-serif;color:#111;max-height:85vh;overflow:auto}#qr-campaign-panel::backdrop{background:#0008}#qr-campaign-panel h2{font-size:22px;margin:0 30px 20px 0}#qr-campaign-panel p{margin:12px 0}#qr-campaign-panel input{border:1px solid #ddd;border-radius:8px;padding:12px;width:100%;margin:10px 0;text-transform:uppercase}#qr-campaign-panel .qr-action{background:#e8222e;color:white;border:0;border-radius:8px;padding:12px 18px;cursor:pointer;width:100%;margin-top:10px}#qr-campaign-panel button:disabled{opacity:.5;cursor:wait}#qr-campaign-panel .qr-close{position:absolute;right:18px;top:12px;background:none;border:0;font-size:28px;cursor:pointer}#qr-message{color:#b71c1c}#qr-campaign-account{background:none;border:0;text-align:left;font:inherit;cursor:pointer;color:#e8222e;padding:12px;width:100%}.qr-number{font-weight:600;font-size:20px}`;
  document.head.append(style);
  const content=panel.querySelector('#qr-content'), message=panel.querySelector('#qr-message');
  async function api(path,body) {
    const response=await fetch(`/api/campaigns${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token()?{Authorization:`Bearer ${token()}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();
    if(!response.ok) { const error=new Error(data.message || 'Əməliyyat alınmadı.'); error.status=response.status; throw error; }
    return data;
  }
  function text(tag,value,cls) { const el=document.createElement(tag); el.textContent=value; if(cls)el.className=cls; content.append(el); return el; }
  function login() { panel.close(); if(typeof closeAccountPanel==='function')closeAccountPanel(); sessionStorage.setItem('qr-login-pending','1'); if(typeof openModal==='function')openModal();else location.href='/index.html?myCampaigns=1'; }
  function success(entry) {
    content.replaceChildren();
    text('p',entry.status==='active'?'Kampaniyada iştirak şansınız aktivləşdirildi!':'Kampaniyada iştirakınız ləğv edilib.');
    text('p',`İştirakçı nömrəniz: ${entry.participantNumber}`,'qr-number');
  }
  async function show() {
    if(!token()) { login(); return; }
    content.replaceChildren(); message.textContent='Yüklənir…';
    try {
      if(ready) await ready;
      message.textContent='';
      if(!token()) { login(); return; }
      const entries=await api('/me');
      if(!panel.open) panel.showModal();
      if(!source) {
        if(!entries.length) text('p','İştirak etmək üçün kampaniyanın QR kodunu skan edin.');
        entries.forEach(e=>{text('p',`İştirakçı nömrəniz: ${e.participantNumber}`,'qr-number');text('p',e.status==='active'?'İştirak şansınız aktivdir!':'Ləğv edilib');}); return;
      }
      const own=entries.find(e=>e.campaignId===campaign.campaignId);
      if(own) {success(own);return;}
      await api('/claim',{scanToken});
      text('h3','İştiraka bir addım qaldı!');
      text('p','FIN kodunu daxil et, kampaniyada iştirak şansını aktivləşdir!');
      const form=document.createElement('form');
      form.innerHTML='<label for="qr-fin">FIN kodunu daxil et</label><input id="qr-fin" name="fin" placeholder="7 simvollu FIN kodun" maxlength="7" minlength="7" pattern="[A-HJ-NP-Za-hj-np-z0-9]{7}" autocomplete="off" autocapitalize="characters" spellcheck="false" required><button class="qr-action" type="submit">İştirak şansımı aktivləşdir</button>';
      content.append(form);
      form.onsubmit=async event=>{
        event.preventDefault(); const button=form.querySelector('button'), input=form.querySelector('input'); button.disabled=true; message.textContent='';
        try { const fin=input.value; input.value=''; success(await api('/activate',{fin,scanToken})); refreshAccount(); }
        catch(error) {message.textContent=error.message;if(error.status===401)login();}
        finally {button.disabled=false;}
      };
    } catch(error) {if(error.status===401){login();return;}message.textContent=error.message;if(!panel.open)panel.showModal();}
  }
  const account=document.createElement('button'); account.id='qr-campaign-account';account.textContent='QR Kampaniya · İştirakçı nömrələrim';account.onclick=()=>{if(typeof closeAccountPanel==='function')closeAccountPanel();show();};
  document.querySelector('#mobile-account-panel .map-content')?.append(account);
  async function refreshAccount(){if(!token())return;try{const entries=await api('/me');account.textContent=entries.length?`QR Kampaniya · ${entries.map(e=>e.participantNumber).join(', ')}`:'QR Kampaniya · İştirakçı nömrələrim';}catch{}}
  window.addEventListener('essen:login',()=>{refreshAccount();if(source || sessionStorage.getItem('qr-login-pending')){sessionStorage.removeItem('qr-login-pending');show();}});
  if(source) {
    document.querySelectorAll('#loginModal [data-auth-step="phone"] .essen-auth-lead, #loginModal [data-auth-step="email"] .essen-auth-lead').forEach(lead=>{
      lead.textContent='Kampaniyadan yararlanmaq üçün qeydiyyatdan keç';
    });
    ready=(async()=>{
      campaign=await api(`/sources/${encodeURIComponent(source)}`);
      const key=`qr-visit:${source}`;let visit=sessionStorage.getItem(key);if(!visit){visit=crypto.randomUUID();sessionStorage.setItem(key,visit);}
      const result=await api(`/sources/${encodeURIComponent(source)}/scans`,{visitId:visit});scanToken=result.scanToken;
    })();
    // Scanning is recorded while registration is open; consume errors until show() awaits it.
    ready.catch(()=>{});
    show();
  }
  refreshAccount();
  function accountMenu(){
    const menu=document.getElementById('essen-account-menu');
    if(menu && !menu.querySelector('[data-qr-account]')){const link=document.createElement('a');link.href='/index.html?myCampaigns=1';link.dataset.qrAccount='1';link.textContent='Kampaniya iştiraklarım';menu.prepend(link);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',accountMenu);else accountMenu();
  if(!source && new URLSearchParams(location.search).has('myCampaigns'))show();
})();
