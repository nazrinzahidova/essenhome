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
  let lastSnapshot = '';
  async function load(background = false) {
    if (background && (busy || dialog.open || document.hidden || reload.disabled)) return;
    const version = ++generation;
    if (!background) { list.replaceChildren(); message.textContent = ''; lastSnapshot = ''; }
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
