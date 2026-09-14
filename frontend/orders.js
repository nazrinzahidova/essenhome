(() => {
  const adminView = new URLSearchParams(location.search).get('admin') === '1';
  const list = document.getElementById('ordersList'), message = document.getElementById('ordersMessage');
  const login = document.getElementById('ordersLogin'), reload = document.getElementById('ordersReload');
  const dialog = document.getElementById('orderReasonDialog'), form = document.getElementById('orderReasonForm');
  const select = document.getElementById('orderReasonSelect'), error = document.getElementById('orderReasonError');
  const statuses = { pending:'Yeni', confirmed:'Təsdiqlənib', shipped:'Göndərilib', delivered:'Təhvil verilib', cancelled:'Ləğv edilib', returned:'Qaytarılıb' };
  const transitions = { pending:['confirmed','cancelled'], confirmed:['shipped','cancelled'], shipped:['delivered'], delivered:['returned'] };
  const payments = { cash:'Nağd (qapıda)', card:'Kart (qapıda)', credit:'Kredit müraciəti' };
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
    document.getElementById('orderReasonNote').textContent = action === 'cancel' ? 'Səbəbi seçin və izah edin. Göndərdikdən sonra sifariş ləğv ediləcək.' : 'Təhvil tarixindən 14 gün ərzində əsaslandırılmış səbəblə müraciət edə bilərsiniz. Müraciətə mağaza baxacaq.';
    select.replaceChildren(); const placeholder = el('option','Səbəblər — seçin'); placeholder.value = ''; select.append(placeholder);
    for (const [value,text] of Object.entries(reasons)) { const option = el('option',text); option.value = value; select.append(option); }
    dialog.showModal();
  }
  async function load() {
    const version = ++generation; list.replaceChildren(); message.textContent = '';
    login.hidden = !!localStorage.getItem('token');
    if (!login.hidden) { message.textContent = 'Sifarişlərinizi görmək üçün hesaba daxil olun.'; return; }
    reload.disabled = true; message.textContent = 'Yüklənir...';
    try {
      const [rows, options] = await Promise.all([request(adminView ? '/admin' : '/my'), request('/reasons')]);
      if (version !== generation) return; reasons = options;
      message.textContent = rows.length ? (adminView ? rows.length + ' sifariş' : '') : 'Hələ sifariş yoxdur.';
      for (const order of rows) {
        const card = el('article'); card.className = 'order-card';
        card.append(el('h2','Sifariş №' + order.id));
        const status = el('p',statuses[order.status] || order.status); status.className = 'order-status'; card.append(status);
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
    } catch(e) { if (version === generation) message.textContent = e.message; }
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
  login.onclick = () => document.getElementById('openLoginModal').click(); reload.onclick = load;
  window.addEventListener('essen:login',load); window.addEventListener('essen:logout',() => { dialog.close(); load(); });
  window.addEventListener('storage',event => { if (event.key === 'token' || event.key === null) { dialog.close(); load(); } });
  if (adminView) { document.getElementById('ordersHeading').textContent = 'Sifarişlər və qaytarmalar'; const back = el('a','Admin panelinə qayıt'); back.href = '/admin.html'; document.getElementById('ordersHeading').after(back); }
  load();
})();
