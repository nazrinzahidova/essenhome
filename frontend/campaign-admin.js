(() => {
  'use strict';
  const tabs=document.querySelector('.admin-tabs');if(!tabs)return;
  const tab=document.createElement('button');tab.className='admin-tab';tab.textContent='QR Kampaniya';tabs.append(tab);
  const view=document.createElement('section');view.id='qr-admin';view.style.display='none';
  view.innerHTML=`<h2>QR Kampaniya</h2><p id="qr-admin-message" role="status"></p>
    <div class="qr-grid"><form id="qr-new-campaign"><label>Yeni kampaniya</label><input name="name" placeholder="Kampaniyanın adı" minlength="2" maxlength="120" required><button class="btn-primary">Kampaniya yarat</button></form>
    <div><label>Kampaniya</label><select id="qr-campaign-select"></select><button id="qr-toggle-campaign" class="btn-primary" type="button">Statusu dəyiş</button></div>
    <form id="qr-new-source"><label>Yeni QR mənbə</label><input name="name" placeholder="Məsələn: Nizami filialı" minlength="2" maxlength="120" required><button class="btn-primary">QR mənbə yarat</button></form></div>
    <div id="qr-sources"></div><div id="qr-code"></div>
    <form id="qr-filters" class="qr-grid"><div><label>Axtarış</label><input name="q" placeholder="İştirakçı №, ad, telefon, e-mail"></div>
    <div><label>Mənbə</label><select name="source" id="qr-source-filter"><option value="">Hamısı</option></select></div>
    <div><label>Məlumatlar</label><select name="kind"><option value="entries">İştirakçılar</option><option value="scans">Skanlar</option></select></div>
    <div><label>Status</label><select name="status"><option value="">Hamısı</option><option value="active">Aktiv iştirakçı</option><option value="cancelled">Ləğv edilmiş</option><option value="scanned">Skan edilib</option><option value="registered">Giriş edilib</option><option value="activated">Aktivləşdirilib</option></select></div>
    <div><label>Başlanğıc tarix</label><input type="date" name="from"></div><div><label>Son tarix</label><input type="date" name="to"></div>
    <div><label>Cihaz</label><select name="device"><option value="">Hamısı</option><option>mobile</option><option>desktop</option><option>tablet</option></select></div>
    <div><label>Brauzer</label><select name="browser"><option value="">Hamısı</option><option>Chrome</option><option>Safari</option><option>Firefox</option><option>Edge</option><option>Opera</option><option>Other</option></select></div>
    <div><label>Əməliyyat sistemi</label><select name="os"><option value="">Hamısı</option><option>Android</option><option>iOS</option><option>Windows</option><option>macOS</option><option>Linux</option><option>Other</option></select></div>
    <button class="btn-primary">Axtar / Yenilə</button></form>
    <div id="qr-stats" class="qr-grid"></div><div id="qr-source-stats"></div>
    <p id="qr-total"></p><div style="overflow:auto"><table><thead><tr><th>İştirakçı №</th><th>Ad və soyad</th><th>Telefon</th><th>E-mail</th><th>FIN</th><th>Mənbə</th><th>Cihaz / Brauzer / OS</th><th>Skan tarixi</th><th>İştirak tarixi</th><th>Status</th><th>Əməliyyat</th></tr></thead><tbody id="qr-rows"></tbody></table></div>
    <button id="qr-prev" type="button">← Əvvəlki</button> <button id="qr-next" type="button">Növbəti →</button>`;
  tabs.after(view);
  const style=document.createElement('style');style.textContent='#qr-admin .qr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin:20px 0}#qr-admin th,#qr-admin td{padding:10px;border-bottom:1px solid var(--line);text-align:left;white-space:nowrap}#qr-admin button{padding:10px;margin-top:8px}#qr-admin-message{color:var(--danger)}#qr-code img{width:240px;height:240px}#qr-sources{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}#qr-sources>div,#qr-stats>div{padding:12px;border:1px solid var(--line);background:white}';document.head.append(style);
  const $=id=>document.getElementById(id), select=$('qr-campaign-select');let campaigns=[],page=1,total=0,requestId=0;
  async function api(path,body,method='POST'){
    const response=await fetch(`/api/campaigns/admin${path}`,{method:body?method:'GET',headers:{Authorization:`Bearer ${localStorage.getItem('token')}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();if(!response.ok)throw new Error(data.message||'Sorğu alınmadı.');return data;
  }
  function safe(fn){return async(...args)=>{ $('qr-admin-message').textContent='';try{await fn(...args);}catch(e){$('qr-admin-message').textContent=e.message;}};}
  function node(tag,value){const el=document.createElement(tag);el.textContent=value??'—';return el;}
  function action(parent,label,fn){const b=node('button',label);b.type='button';b.onclick=safe(async()=>{b.disabled=true;try{await fn();}finally{b.disabled=false;}});parent.append(b);}
  tab.onclick=safe(async()=>{
    for(const id of ['productView','chatView','homeSectionsView','creditOrdersView'])if($(id))$(id).style.display='none';
    if($('usersView'))$('usersView').hidden=true;
    if($('brandsView'))$('brandsView').hidden=true;
    tabs.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
    tab.classList.add('active');view.style.display='block';await loadCampaigns();
  });
  tabs.querySelectorAll('.admin-tab').forEach(other=>{if(other!==tab)other.addEventListener('click',()=>{view.style.display='none';tab.classList.remove('active');});});
  async function loadCampaigns(){const old=select.value;campaigns=await api('/campaigns');select.replaceChildren();campaigns.forEach(c=>{const o=node('option',`${c.name}${c.active?'':' (Dayandırılıb)'}`);o.value=c.id;select.append(o);});if(campaigns.some(c=>String(c.id)===old))select.value=old;await changed();}
  async function changed(){page=1;$('qr-code').replaceChildren();await sources();await load();}
  select.onchange=safe(changed);
  $('qr-new-campaign').onsubmit=safe(async e=>{e.preventDefault();await api('/campaigns',{name:e.target.elements.name.value});e.target.reset();await loadCampaigns();});
  $('qr-new-source').onsubmit=safe(async e=>{e.preventDefault();if(!select.value)throw new Error('Əvvəlcə kampaniya yaradın.');await api('/sources',{campaignId:Number(select.value),name:e.target.elements.name.value});e.target.reset();await sources();});
  $('qr-toggle-campaign').onclick=safe(async()=>{const current=campaigns.find(c=>String(c.id)===select.value);if(!current)return;await api(`/campaigns/${current.id}`,{active:!current.active},'PATCH');await loadCampaigns();});
  async function sources(){
    const area=$('qr-sources');area.replaceChildren();const filter=$('qr-source-filter');filter.replaceChildren();const all=node('option','Hamısı');all.value='';filter.append(all);if(!select.value)return;
    for(const source of await api(`/sources?campaignId=${select.value}`)){
      const o=node('option',source.name);o.value=source.id;filter.append(o);
      const card=document.createElement('div');card.append(node('strong',source.name),node('p',source.active?'Aktiv':'Dayandırılıb'));area.append(card);
      action(card,'QR göstər / Yüklə',async()=>{
        const data=await api(`/sources/${source.id}/qr`);const area=$('qr-code');area.replaceChildren();const blob=new Blob([data.svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob);
        const img=document.createElement('img');img.src=url;img.alt=`${source.name} QR kodu`;area.append(img);
        const download=node('a','QR kodu yüklə');download.href=url;download.download=`qr-${source.id}.svg`;area.append(download,node('p',data.url));
        const link=node('a','Kampaniyanı aç');link.href=data.url;link.target='_blank';link.rel='noopener';area.append(link);
      });
      action(card,source.active?'Dayandır':'Aktiv et',async()=>{await api(`/sources/${source.id}`,{active:!source.active},'PATCH');await sources();});
    }
  }
  $('qr-filters').onsubmit=safe(async e=>{e.preventDefault();page=1;await load();});
  $('qr-prev').onclick=safe(async()=>{if(page>1){page--;await load();}});$('qr-next').onclick=safe(async()=>{if(page*50<total){page++;await load();}});
  async function load(){
    const generation=++requestId;$('qr-rows').replaceChildren();$('qr-stats').replaceChildren();$('qr-source-stats').replaceChildren();if(!select.value){$('qr-total').textContent='İlk kampaniyanızı yaradın.';return;}
    const query=new URLSearchParams(new FormData($('qr-filters')));const kind=query.get('kind');query.delete('kind');query.set('campaignId',select.value);query.set('page',page);
    const [data,stats]=await Promise.all([api(`/${kind}?${query}`),api(`/stats?${query}`)]);if(generation!==requestId)return;
    total=data.total;$('qr-total').textContent=`${total} nəticə · Səhifə ${page}`;$('qr-prev').disabled=page===1;$('qr-next').disabled=page*50>=total;
    for(const [label,value] of [['Skanlar',stats.scans],['Daxil olan istifadəçilər',stats.registeredUsers],['İştirakçılar',stats.participants],['Aktiv',stats.active],['Ləğv edilmiş',stats.cancelled],['İştirak / skan',`${stats.scans?(stats.participants/stats.scans*100).toFixed(1):0}%`]]){const card=document.createElement('div');card.append(node('p',label),node('strong',value));$('qr-stats').append(card);}
    $('qr-source-stats').append(node('p','Statistika mənbə, cihaz və skan tarixi filtrlərinə əsaslanır. Tarix sərhədləri UTC-dir.'));
    stats.sources.forEach(s=>$('qr-source-stats').append(node('p',`${s.name}: ${s.scans} skan, ${s.participants} iştirakçı`)));
    const date=value=>value?new Date(value).toLocaleString('az-AZ'):'—';
    const labels={active:'Aktiv',cancelled:'Ləğv edilib',scanned:'Skan edilib',registered:'Giriş edilib',activated:'Aktivləşdirilib'};
    data.items.forEach(row=>{
      const tr=document.createElement('tr');[row.participantNumber,row.name,row.phone,row.email,row.fin || (row.finMasked ? `${row.finMasked} (köhnə qeyd)` : null),row.source,`${row.device} / ${row.browser} / ${row.os}`,date(row.scannedAt),date(row.createdAt),labels[kind==='entries'?row.status:row.scanStatus]].forEach(value=>tr.append(node('td',value)));
      const td=document.createElement('td');if(kind==='entries')action(td,row.status==='active'?'Ləğv et':'Bərpa et',async()=>{await api(`/entries/${row.id}`,{status:row.status==='active'?'cancelled':'active'},'PATCH');await load();});tr.append(td);$('qr-rows').append(tr);
    });
  }
})();
