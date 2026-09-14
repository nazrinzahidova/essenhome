(() => {
  const dialog = document.getElementById('checkoutDialog');
  const form = document.getElementById('orderCheckoutForm');
  form.noValidate = true;
  const date = document.getElementById('orderDeliveryDate');
  const address = document.getElementById('orderAddress');
  const message = document.getElementById('orderCheckoutMessage');
  const success = document.getElementById('orderCheckoutSuccess');
  let items = [], pendingLogin = null, sending = false, pending = null, key = '';
  const creditButton = document.getElementById('creditCheckoutOption');
  const creditNote = document.getElementById('creditMinimumNote');
  const creditSubtotal = () => items.reduce((sum, item) => sum + Math.round(Number(item.price) * 100) * Number(item.qty), 0) / 100;
  function updateCreditOption() {
    const subtotal = creditSubtotal();
    const eligible = Number.isFinite(subtotal) && subtotal >= EssenOrderPolicy.creditMinimum;
    creditButton.disabled = sending || !!pending || !eligible;
    creditNote.hidden = eligible || !!pending;
  }
  const storageKey = () => 'essen:pending-order:' + (localStorage.getItem('activeUser') || '');
  const savePending = () => { try { pending ? sessionStorage.setItem(storageKey(), JSON.stringify(pending)) : sessionStorage.removeItem(storageKey()); } catch {} };
  async function refreshDate() {
    const response = await fetch('/api/delivery-options', { cache: 'no-store' });
    if (!response.ok) throw Error('Çatdırılma tarixləri yüklənmədi. Yenidən cəhd edin.');
    const data = await response.json();
    if (!EssenOrderPolicy.validDate(data.minDate)) throw Error('Çatdırılma tarixi alınmadı.');
    date.min = data.minDate;
    if (!date.value) date.value = date.min;
    date.setCustomValidity(date.value < date.min ? 'Bu tarix artıq seçilə bilməz. Yeni tarix seçin.' : '');
  }
  date.addEventListener('input', () => date.setCustomValidity(''));
  function lock(value) {
    sending = value;
    form.querySelectorAll('button,input,textarea').forEach(n => { n.disabled = value; });
    document.getElementById('checkoutClose').disabled = value;
    updateCreditOption();
  }
  dialog.addEventListener('cancel', event => { if (sending) event.preventDefault(); });
  async function open(snapshot) {
    if (sending || dialog.open) return;
    const button = document.getElementById('checkoutButton'); button.disabled = true;
    try {
      items = Array.isArray(snapshot) ? snapshot : await fetchCart();
      if (!localStorage.getItem('token')) {
        if (!items.length) return;
        pendingLogin = items;
        document.getElementById('openLoginModal').click();
        return;
      }
      pending = null;
      try { pending = JSON.parse(sessionStorage.getItem(storageKey())); } catch {}
      if (pending) items = pending.items.map(i => ({ id: i.productId, qty: i.quantity, color: i.color }));
      if (!items.length) { await renderCart(); return; }
      form.hidden = false; success.hidden = true; success.replaceChildren(); message.textContent = '';
      key = pending?.requestKey || crypto.randomUUID();
      date.value = pending?.deliveryDate || '';
      address.value = pending?.address || address.value;
      await refreshDate();
      if (pending) message.textContent = 'Əvvəlki sorğunun nəticəsi alınmayıb. Eyni sifarişi təkrar yoxlamaq üçün ödəniş düyməsinə basın.';
      updateCreditOption();
      dialog.showModal();
    } catch (error) { alert(error.message); }
    finally { button.disabled = false; }
  }
  window.addEventListener('essen:login', () => { if (pendingLogin) { const snapshot = pendingLogin; pendingLogin = null; open(snapshot); } });
  window.addEventListener('essen:logout', () => { pendingLogin = null; items = []; pending = null; dialog.close(); });
  async function creditContext() {
    if (sending) return null;
    if (pending) { message.textContent = 'Əvvəlki sifarişin nəticəsini yoxlayın.'; return null; }
    const subtotal = creditSubtotal();
    if (!Number.isFinite(subtotal) || subtotal < EssenOrderPolicy.creditMinimum) { message.textContent = 'Kredit müraciəti üçün məhsulların cəmi minimum 199.99 AZN olmalıdır.'; return null; }
    try { await refreshDate(); } catch (e) { message.textContent = e.message; return null; }
    if (!form.reportValidity()) return null;
    return { items, deliveryDate: date.value, address: address.value.trim() };
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (sending) return;
    const method = event.submitter?.dataset.checkoutMethod;
    if (!method) return;
    if (!localStorage.getItem('token')) { dialog.close(); pendingLogin = items; document.getElementById('openLoginModal').click(); return; }
    try {
      if (!pending) {
        await refreshDate(); if (!form.reportValidity()) return;
        pending = { requestKey: key, paymentMethod: method, deliveryDate: date.value, address: address.value.trim(),
          items: items.map(i => ({ productId: Number(i.id), quantity: Number(i.qty), color: i.color || '' })) };
        savePending();
      }
      lock(true); message.textContent = 'Sifariş saxlanılır...';
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify(pending) });
      const data = await response.json();
      if (!response.ok) {
        // Definitive validation errors did not create an order; a network/server failure is retried with the same key.
        if ([400, 401, 409].includes(response.status)) { pending = null; savePending(); key = crypto.randomUUID(); }
        throw Error(data.message || 'Sifariş saxlanmadı. Yenidən cəhd edin.');
      }
      pending = null; savePending(); form.hidden = true; success.hidden = false;
      message.textContent = `Sifariş №${data.id} saxlanıldı. Cəmi: ${Number(data.total).toFixed(2)} AZN.`;
      const orders = document.createElement('a'); orders.href = '/orders.html'; orders.textContent = 'Sifarişlərimə bax'; success.append(orders);
    } catch (error) { message.textContent = error.message === 'Failed to fetch' ? 'Bağlantı alınmadı. Eyni sifarişi təhlükəsiz təkrar yoxlamaq üçün yenidən basın.' : error.message; }
    finally { lock(false); }
  });
  window.EssenCheckout = { open, creditContext };
})();
