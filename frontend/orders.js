(() => {
  const adminView = new URLSearchParams(location.search).get('admin') === '1';
  const list = document.getElementById('ordersList'), message = document.getElementById('ordersMessage');
  const login = document.getElementById('ordersLogin'), reload = document.getElementById('ordersReload');
  const dialog = document.getElementById('orderReasonDialog'), form = document.getElementById('orderReasonForm');
  const select = document.getElementById('orderReasonSelect'), error = document.getElementById('orderReasonError');
  const statuses = { pending:'Sifariş qeydə alındı', confirmed:'Hazırlanır', shipped:'Çatdırılmada', delivered:'Çatdırıldı', cancelled:'Ləğv edildi', returned:'Qaytarılıb' };
  const transitions = { pending:['confirmed','cancelled'], confirmed:['shipped','cancelled'], shipped:['delivered','cancelled'], delivered:['returned'] };
  const payments = { cash:'Nağd (qapıda)', card:'Kart (qapıda)', credit:'Kredit müraciəti' };
  const detailsField = document.getElementById('orderDetailsField');
  const detailsInput = form.elements.details;
  function updateDetails() {
    const other = select.value === 'other';
    detailsField.hidden = !other;
    detailsField.style.display = other ? '' : 'none';
    detailsInput.required = other;
    detailsInput.disabled = !other;
    if (!other) detailsInput.value = '';
  }
  select.addEventListener('change', updateDetails);
  let chosen = null, busy = false, generation = 0, reasons = {};
  const el = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
  const money = n => Number(n).toFixed(2) + ' AZN';
  async function request(path, options = {}) {
    const r = await fetch('/api/orders' + path, { cache:'no-store', ...options, headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + localStorage.getItem('token') } });
    const data = await r.json();
    if (!r.ok) throw Error(data.message || (r.status === 401 ? 'Hesaba daxil olun.' : r.status === 403 ? 'Bu bölmə yalnız admin üçündür.' : 'Əməliyyat alınmadı.'));
    return data;
  }
  function reasonDialog(order, action) {
    if (busy) return;
    chosen = { id:order.id, action }; form.reset(); error.textContent = '';
    document.getElementById('orderReasonTitle').textContent = action === 'cancel' ? 'Sifarişi ləğv et — №' + order.id : 'Qaytarma müraciəti — №' + order.id;
    document.getElementById('orderReasonNote').textContent = action === 'cancel' ? 'Səbəbi seçin. Göndərdikdən sonra sifariş ləğv ediləcək.' : 'Təhvil tarixindən 14 gün ərzində əsaslandırılmış səbəblə müraciət edə bilərsiniz. Müraciətə mağaza baxacaq.';
    select.replaceChildren(); const placeholder = el('option','Səbəblər — seçin'); placeholder.value = ''; select.append(placeholder);
    for (const [value,text] of Object.entries(reasons)) { const option = el('option',text); option.value = value; select.append(option); }
    updateDetails();
    dialog.showModal();
  }
function createOrderCalendar(list, statuses) {
  const dateKey = value => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Baku',year:'numeric',month:'2-digit',day:'2-digit' }).formatToParts(date).map(p=>[p.type,p.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  const today = () => dateKey(new Date());
  let month = today().slice(0,7), selected = '', mode = 'calendar', rows = [], cards = [];
  const root = document.createElement('section'); root.className = 'order-calendar'; root.setAttribute('aria-label','Sifariş təqvimi');
  root.innerHTML = `<style>
    .order-calendar{background:#fff;border:1px solid #e3e5e8;border-radius:16px;padding:20px;margin:20px 0;color:#202530}
    .oc-toolbar,.oc-filters{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
    .oc-toolbar h2{flex:1;margin:0;font-size:21px;min-width:170px;text-transform:capitalize}
    .order-calendar button,.order-calendar input,.order-calendar select{font:inherit;border:1px solid #d9dde3;border-radius:8px;background:#fff;color:#202530;padding:9px 12px}
    .order-calendar button{cursor:pointer}.order-calendar button:focus-visible{outline:3px solid #e8222e;outline-offset:2px}
    .oc-filters label{display:grid;gap:5px;font-size:12px;flex:1;min-width:145px}.oc-filters input,.oc-filters select{min-width:0;width:100%;box-sizing:border-box}
    .oc-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px}
    .oc-weekday{text-align:center;padding:7px 0;font-size:12px;color:#647084}
    .order-calendar .oc-day{min-height:78px;text-align:left;padding:8px;display:flex;flex-direction:column;gap:8px}
    .oc-day span{font-size:11px;font-weight:600}.order-calendar .oc-day.has-orders{background:#fff3f3;border-color:#f2c6cc}
    .order-calendar .oc-day.is-today{box-shadow:inset 0 0 0 1px #e8222e}.order-calendar .oc-day[aria-pressed=true]{background:#e8222e;color:#fff;border-color:#e8222e}
    .order-calendar .oc-day:disabled{background:#f6f7f9;color:#a4abb5;cursor:default}.oc-summary{margin:16px 0 10px;font-weight:600}
    .oc-note{font-size:12px;color:#647084;margin:0 0 12px}.order-card[hidden],.order-calendar [hidden]{display:none!important}
    .oc-bottom{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.oc-empty{padding:20px;border:1px dashed #d9dde3;border-radius:12px}
    @media(max-width:600px){.order-calendar{padding:12px}.order-calendar .oc-day{min-height:59px;padding:5px;font-size:12px}.oc-day span{font-size:9px}.oc-grid{gap:3px}.oc-toolbar h2{flex-basis:100%}.oc-filters label{min-width:125px}}
  </style>
  <div class="oc-toolbar"><h2>Sifariş təqvimi</h2><button type="button" data-action="previous" aria-label="Əvvəlki ay">‹</button><input type="month" aria-label="Ayı seçin"><button type="button" data-action="next" aria-label="Növbəti ay">›</button><button type="button" data-action="today">Bu gün</button><button type="button" data-action="mode">Bütün sifarişlər</button></div>
  <div class="oc-filters"><label>Tarix növü<select data-filter="date"><option value="deliveryDate">Çatdırılma tarixi</option><option value="createdAt">Sifariş tarixi</option></select></label><label>Status<select data-filter="status"><option value="">Bütün statuslar</option><option value="active">Aktiv sifarişlər</option></select></label><label>Axtarış<input type="search" placeholder="Nömrə, müştəri, telefon, məhsul" aria-label="Sifariş axtar"></label></div>
  <p class="oc-note">Günü seçin, aşağıdakı sifarişlərin detallarına baxın və statusunu idarə edin. Tarixlər Bakı vaxtı ilə göstərilir.</p>
  <div class="oc-grid" aria-label="Ayın günləri"></div><p class="oc-summary" role="status" aria-live="polite"></p>
  <div class="oc-bottom"><button type="button" data-action="month">Bütün ay</button><button type="button" data-action="undated">Tarixi olmayanlar</button></div>`;
  list.before(root);
  const empty = document.createElement('p'); empty.className='oc-empty'; empty.hidden=true; empty.textContent='Bu seçimə uyğun sifariş yoxdur.'; list.before(empty);
  const $ = selector => root.querySelector(selector);
  const statusSelect = $('[data-filter=status]'), dateSelect = $('[data-filter=date]'), search = $('input[type=search]'), monthInput = $('input[type=month]');
  for (const [value,label] of Object.entries(statuses)) { const o=document.createElement('option'); o.value=value; o.textContent=label; statusSelect.append(o); }
  const key = row => dateKey(row[dateSelect.value]);
  function filtered(row) {
    const status=statusSelect.value;
    if (status==='active' ? !['pending','confirmed','shipped'].includes(row.status) : status && row.status!==status) return false;
    const query=search.value.trim().toLocaleLowerCase('az');
    return !query || [row.id,row.user?.name,row.user?.phone,row.address,...(row.items||[]).map(i=>i.name||i.product?.name)].join(' ').toLocaleLowerCase('az').includes(query);
  }
  function render() {
    const eligible=rows.filter(filtered), counts=new Map();
    for(const row of eligible) {const day=key(row); counts.set(day,(counts.get(day)||0)+1);}
    const grid=$('.oc-grid'); grid.replaceChildren(); grid.hidden=mode==='all'; monthInput.value=month;
    $('[data-action=mode]').textContent=mode==='all'?'Təqvimə qayıt':'Bütün sifarişlər';
    $('[data-action=month]').hidden=mode==='all';
    if(mode!=='all') {
      for(const day of ['B.e.','Ç.a.','Ç.','C.a.','C.','Ş.','B.']) {const label=document.createElement('div');label.className='oc-weekday';label.textContent=day;grid.append(label);}
      const [year,m]=month.split('-').map(Number), offset=(new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7, days=new Date(Date.UTC(year,m,0)).getUTCDate();
      const cells=Math.ceil((offset+days)/7)*7;
      for(let cell=0;cell<cells;cell++) {
        const day=cell-offset+1, button=document.createElement('button');button.type='button';button.className='oc-day';
        if(day<1||day>days) {button.disabled=true;button.setAttribute('aria-hidden','true');grid.append(button);continue;}
        const value=month+'-'+String(day).padStart(2,'0'), count=counts.get(value)||0;
        button.textContent=String(day);button.dataset.date=value;button.setAttribute('aria-label',`${value}: ${count} sifariş`);button.setAttribute('aria-pressed',String(selected===value));
        if(value===today()) {button.classList.add('is-today');button.setAttribute('aria-current','date');}
        if(count) {button.classList.add('has-orders');const badge=document.createElement('span');badge.textContent=count+' sifariş';button.append(badge);}
        button.onclick=()=>{selected=value;render();};grid.append(button);
      }
    }
    let count=0,total=0;
    rows.forEach((row,index)=>{
      const date=key(row);
      const visible=filtered(row)&&(selected==='undated'?!date:mode==='all'?true:selected?date===selected:date.startsWith(month));
      if(cards[index]) cards[index].hidden=!visible;
      if(visible) {count++;total+=Number(row.total)||0;}
    });
    const label=selected==='undated'?'Tarixi olmayanlar':mode==='all'?'Bütün tarixlər':selected||month;
    $('.oc-summary').textContent=`${label} · ${count} sifariş · ${total.toFixed(2)} AZN`;
    $('[data-action=undated]').textContent=`Tarixi olmayanlar (${counts.get('')||0})`;
    empty.hidden=count!==0||rows.length===0;
  }
  function shift(delta) { const [y,m]=month.split('-').map(Number);month=new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7);selected='';mode='calendar';render(); }
  $('[data-action=previous]').onclick=()=>shift(-1);$('[data-action=next]').onclick=()=>shift(1);
  $('[data-action=today]').onclick=()=>{month=today().slice(0,7);selected=today();mode='calendar';render();};
  $('[data-action=mode]').onclick=()=>{mode=mode==='all'?'calendar':'all';selected='';render();};
  $('[data-action=month]').onclick=()=>{selected='';render();};
  $('[data-action=undated]').onclick=()=>{selected='undated';render();};
  monthInput.onchange=()=>{if(/^\d{4}-\d{2}$/.test(monthInput.value)&&Number(monthInput.value.slice(0,4))>=1000&&Number(monthInput.value.slice(0,4))<=9999) {month=monthInput.value;selected='';mode='calendar';render();}};
  statusSelect.onchange=render;dateSelect.onchange=()=>{selected='';render();};search.oninput=render;
  root.hidden=true;
  return {update(data){rows=data;cards=[...list.children];root.hidden=false;render();},clear(){rows=[];cards=[];root.hidden=true;empty.hidden=true;}};
}

  const calendar = adminView ? createOrderCalendar(list, statuses) : null;
  let lastSnapshot = '';
  async function load(background = false) {
    if (background && (busy || dialog.open || document.hidden || reload.disabled)) return;
    const version = ++generation;
    if (!background) { calendar?.clear(); list.replaceChildren(); message.textContent = ''; lastSnapshot = ''; }
    login.hidden = !!localStorage.getItem('token');
    if (!login.hidden) { message.textContent = 'Sifarişlərinizi görmək üçün hesaba daxil olun.'; return; }
    reload.disabled = true; if (!background) message.textContent = 'Yüklənir...';
    try {
      const [rows, options] = await Promise.all([request(adminView ? '/admin' : '/my'), request('/reasons')]);
      if (version !== generation) return; reasons = options;
      const snapshot = JSON.stringify(rows);
      if (background && snapshot === lastSnapshot) return;
      lastSnapshot = snapshot; list.replaceChildren();
      message.textContent = rows.length ? (adminView ? rows.length + ' sifariş' : '') : 'Hələ sifariş yoxdur.';
      for (const order of rows) {
        const card = el('article'); card.className = 'order-card';
        const header = el('div'); header.className = 'order-card-header';
        header.append(el('h2','Sifariş №' + order.id));
        const gallery = el('div'); gallery.className = 'order-product-images'; gallery.setAttribute('aria-label','Sifarişdəki məhsullar');
        for (const item of order.items) {
          const name = item.name || item.product?.name || 'Məhsul';
          const tile = el('div'); tile.className = 'order-product-image'; tile.title = name;
          const fallback = el('span','Şəkil yoxdur'); tile.append(fallback);
          const source = item.product?.image;
          if (source) {
            try {
              const url = new URL(source,location.origin);
              if (['http:','https:'].includes(url.protocol)) {
                const img = el('img'); img.alt = name; img.loading = 'lazy'; img.width = 88; img.height = 88;
                img.onload = () => { fallback.hidden = true; }; img.onerror = () => { img.remove(); fallback.hidden = false; };
                img.src = url.href; tile.append(img);
              }
            } catch {}
          }
          gallery.append(tile);
        }
        header.append(gallery); card.append(header);
        const status = el('p',statuses[order.status] || order.status); status.className = 'order-status order-status-' + order.status; card.append(status);
        const progress = el('ol'); progress.className = 'order-progress'; progress.setAttribute('aria-label','Sifarişin mərhələləri');
        const steps = ['pending','confirmed','shipped','delivered'];
        const current = steps.indexOf(order.status);
        for (const [index,step] of steps.entries()) {
          const marker = el('li',statuses[step]);
          if (current >= index || order.status === 'returned') marker.classList.add('is-complete');
          if (step === order.status) { marker.classList.add('is-current'); marker.setAttribute('aria-current','step'); }
          progress.append(marker);
        }
        if (order.status === 'cancelled' || order.status === 'returned') {
          const terminal = el('li',statuses[order.status]); terminal.className = 'is-current is-terminal'; terminal.setAttribute('aria-current','step'); progress.append(terminal);
        }
        card.append(progress);
        const details = el('dl');
        const fields = [['Tarix',new Date(order.createdAt).toLocaleString('az-AZ',{timeZone:'Asia/Baku'})],['Çatdırılma tarixi',order.deliveryDate || 'Qeyd olunmayıb'],['Ünvan',order.address || 'Qeyd olunmayıb'],['Ödəniş',payments[order.paymentMethod] || 'Qeyd olunmayıb'],['Çatdırılma haqqı',money(order.shippingFee)],['Cəmi',money(order.total)]];
        if (adminView) fields.unshift(['Müştəri',order.user?.name || ''],['Telefon',order.user?.phone || '']);
        if (order.cancellationReason) fields.push(['Ləğv səbəbi',order.cancellationReason]);
        if (order.returnReason) fields.push(['Qaytarma səbəbi',order.returnReason]);
        for (const [label,value] of fields) details.append(el('dt',label),el('dd',value)); card.append(details);
        const products = el('ul'); for (const i of order.items) products.append(el('li',`${i.name || i.product?.name || 'Məhsul №'+i.productId} — ${i.quantity} × ${money(i.price)}${i.color ? ' · '+i.color : ''}`)); card.append(products);
        if (order.returnRequestedAt) { const note = el('p',order.status === 'returned' ? 'Qaytarma tamamlanıb.' : 'Qaytarma müraciəti qəbul edilib, mağazanın baxışını gözləyir.'); note.className = 'order-notice'; card.append(note); }
        const actions = el('div'); actions.className = 'order-actions';
        if (adminView) {
          for (const next of transitions[order.status] || []) {
            if (next === 'returned' && !order.returnRequestedAt) continue;
            const button = el('button',statuses[next]); button.type = 'button';
            button.onclick = async () => { button.disabled = true; try { await request('/admin/' + order.id,{method:'PATCH',body:JSON.stringify({status:next})}); await load(); } catch(e) { message.textContent = e.message; button.disabled = false; } };
            actions.append(button);
          }
        } else {
          for (const action of ['cancel','return']) if (action === 'cancel' ? order.canCancel : order.canReturn) {
            const button = el('button',action === 'cancel' ? 'Sifarişi ləğv et' : 'Qaytarma müraciəti'); button.type = 'button'; button.onclick = () => reasonDialog(order,action); actions.append(button);
          }
        }
        card.append(actions); list.append(card);
      }
      calendar?.update(rows);
    } catch(e) { if (version === generation && !background) message.textContent = e.message; }
    finally { if (version === generation) reload.disabled = false; }
  }
  form.onsubmit = async event => {
    event.preventDefault(); if (busy || !chosen || !form.reportValidity()) return;
    busy = true; form.querySelectorAll('button').forEach(b => b.disabled = true); error.textContent = '';
    try { await request('/' + chosen.id + '/' + chosen.action,{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))}); dialog.close(); await load(); }
    catch(e) { error.textContent = e.message; }
    finally { busy = false; form.querySelectorAll('button').forEach(b => b.disabled = false); }
  };
  document.getElementById('orderReasonClose').onclick = () => { if (!busy) dialog.close(); };
  dialog.addEventListener('cancel',event => { if (busy) event.preventDefault(); });
  login.onclick = () => document.getElementById('openLoginModal').click(); reload.onclick = () => load();
  window.addEventListener('essen:login',() => load()); window.addEventListener('essen:logout',() => { dialog.close(); load(); });
  window.addEventListener('storage',event => { if (event.key === 'token' || event.key === null) { dialog.close(); load(); } });
  if (adminView) { document.getElementById('ordersHeading').textContent = 'Sifarişlər və qaytarmalar'; const back = el('a','Admin panelinə qayıt'); back.href = '/admin.html'; document.getElementById('ordersHeading').after(back); }
  setInterval(() => load(true),30000);
  document.addEventListener('visibilitychange',() => { if (!document.hidden) load(true); });
  load();
})();

