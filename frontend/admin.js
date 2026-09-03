// ============== KONFİQURASİYA ==============
const API = ''; // eyni origin-dən işləyir (server.js eyni portda frontend-i də servis edir)

// ============== RƏNG PALİTRASI ==============
const COLOR_PALETTE = [
  { name: 'qara',      hex: '#1b1b1b' },
  { name: 'ağ',        hex: '#ffffff', white: true },
  { name: 'boz',       hex: '#9ca3af' },
  { name: 'gümüşü',    hex: '#c0c0c0' },
  { name: 'qızılı',    hex: '#d4af37' },
  { name: 'mavi',      hex: '#2563eb' },
  { name: 'göy',       hex: '#0ea5e9' },
  { name: 'lacivərd',  hex: '#1e3a8a' },
  { name: 'qırmızı',   hex: '#dc2626' },
  { name: 'yaşıl',     hex: '#16a34a' },
  { name: 'sarı',      hex: '#eab308' },
  { name: 'bənövşəyi', hex: '#9333ea' },
  { name: 'cobalt violet', hex: '#5D3FD3' },
  { name: 'cosmic red',    hex: '#DA244B' },
  { name: 'cobalt blue',   hex: '#0047AB' },
  { name: 'galactic purple', hex: '#7D0185' },
  { name: 'chrome teal',     hex: '#9EFCFF' },
  { name: 'indigo',          hex: '#100591' },
  { name: 'midnight black',  hex: '#4E545C' },
  { name: 'çəhrayı',   hex: '#ec4899' },
  { name: 'narıncı',   hex: '#f97316' },
  { name: 'qəhvəyi',   hex: '#7c4a2d' },
  { name: 'bej',       hex: '#e8dcc8' },
];

// ============== YARDIMÇI FUNKSİYALAR ==============
function getToken() {
  return localStorage.getItem('token');
}
function getUser() {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
}
function setSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
function authHeaders() {
  return { 'Authorization': `Bearer ${getToken()}` };
}

// ============== EKRAN KEÇİDİ ==============
function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const user = getUser();
  document.getElementById('whoami').textContent = user ? `${user.name} (${user.email})` : '';
  loadProducts();
}
function showLogin() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
}

// ============== LOGIN ==============
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const emailInput = document.getElementById('loginEmail');
  const email = emailInput.value.trim().toLowerCase();
  emailInput.value = email;
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.message || 'Daxil olmaq mümkün olmadı';
      errEl.style.display = 'block';
      return;
    }

    if (data.user.role !== 'admin') {
      errEl.textContent = 'Bu hesabın admin icazəsi yoxdur';
      errEl.style.display = 'block';
      return;
    }

    setSession(data.token, data.user);
    showApp();
  } catch (err) {
    errEl.textContent = 'Serverlə əlaqə qurula bilmədi';
    errEl.style.display = 'block';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearSession();
  showLogin();
});

// ============== İSTİFADƏÇİ ÇATLARI ==============
let activeChatId = null;
let chatRefreshTimer = null;
let adminChatStreamAbort = null;
const productsTab = document.getElementById('productsTab');
const chatsTab = document.getElementById('chatsTab');

productsTab.addEventListener('click', () => {
  productsTab.classList.add('active'); chatsTab.classList.remove('active');
  document.getElementById('productView').style.display = 'block'; document.getElementById('chatView').style.display = 'none';
  clearInterval(chatRefreshTimer);
  adminChatStreamAbort?.abort();
});
chatsTab.addEventListener('click', () => {
  chatsTab.classList.add('active'); productsTab.classList.remove('active');
  document.getElementById('productView').style.display = 'none'; document.getElementById('chatView').style.display = 'block';
  loadChatSessions(); connectAdminChatStream();
});
document.getElementById('refreshChatsBtn').addEventListener('click', () => loadChatSessions());

async function connectAdminChatStream() {
  adminChatStreamAbort?.abort();
  adminChatStreamAbort = new AbortController();
  try {
    const response = await fetch(`${API}/api/chats/admin/stream`, { headers: authHeaders(), signal: adminChatStreamAbort.signal });
    if (!response.ok || !response.body) throw new Error('stream unavailable');
    const reader = response.body.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
      await loadChatSessions(false);
      if (activeChatId) await loadChatRoom(activeChatId, false);
    }
  } catch (error) {
    if (error.name !== 'AbortError' && chatsTab.classList.contains('active')) {
      clearTimeout(chatRefreshTimer);
      chatRefreshTimer = setTimeout(connectAdminChatStream, 1500);
    }
  }
}

async function loadChatSessions(showError = true) {
  try {
    const response = await fetch(`${API}/api/chats/admin/sessions/list`, { headers: authHeaders() });
    if (!response.ok) throw new Error();
    const sessions = await response.json();
    document.getElementById('chatCount').textContent = `${sessions.length} çat`;
    const list = document.getElementById('chatList');
    if (!sessions.length) { list.innerHTML = '<div class="empty-state">Hələ çat yoxdur.</div>'; return; }
    list.innerHTML = sessions.map(session => `<div class="chat-person ${session.id === activeChatId ? 'active' : ''}" data-chat-id="${session.id}"><strong>${escapeHtml(session.name)}</strong><span>📞 ${escapeHtml(session.phone)}</span><span>${escapeHtml(session.messages?.[0]?.text || 'Yeni çat')}</span></div>`).join('');
    list.querySelectorAll('[data-chat-id]').forEach(item => item.addEventListener('click', () => loadChatRoom(Number(item.dataset.chatId))));
  } catch { if (showError) showToast('Çatlar yüklənmədi'); }
}

async function loadChatRoom(id, showError = true) {
  try {
    const response = await fetch(`${API}/api/chats/admin/sessions/${id}`, { headers: authHeaders() });
    if (!response.ok) throw new Error();
    const session = await response.json(); activeChatId = session.id;
    document.getElementById('chatRoomHead').textContent = `${session.name} — ${session.phone}`;
    const messages = document.getElementById('chatMessages');
    messages.innerHTML = session.messages.map(message => `<div class="chat-message ${message.sender === 'admin' ? 'admin' : 'user'}">${escapeHtml(message.text)}</div>`).join('');
    messages.scrollTop = messages.scrollHeight;
    document.getElementById('chatReplyInput').disabled = false; document.getElementById('chatReplyBtn').disabled = false;
    document.querySelectorAll('[data-chat-id]').forEach(item => item.classList.toggle('active', Number(item.dataset.chatId) === id));
  } catch { if (showError) showToast('Çat yüklənmədi'); }
}

document.getElementById('chatReplyForm').addEventListener('submit', async event => {
  event.preventDefault(); const input = document.getElementById('chatReplyInput'); const text = input.value.trim();
  if (!activeChatId || !text) return;
  const response = await fetch(`${API}/api/chats/admin/sessions/${activeChatId}/messages`, { method:'POST', headers:{ ...authHeaders(), 'Content-Type':'application/json' }, body:JSON.stringify({ text }) });
  if (!response.ok) return showToast('Cavab göndərilmədi');
  input.value = ''; await loadChatRoom(activeChatId, false); await loadChatSessions(false);
});

const passwordOverlay = document.getElementById('passwordOverlay');
const changePasswordError = document.getElementById('changePasswordError');

function closePasswordModal() {
  passwordOverlay.style.display = 'none';
  document.getElementById('changePasswordForm').reset();
  changePasswordError.textContent = '';
}

document.getElementById('changePasswordBtn').addEventListener('click', () => {
  passwordOverlay.style.display = 'flex';
  document.getElementById('currentPassword').focus();
});
document.getElementById('closePasswordBtn').addEventListener('click', closePasswordModal);
document.getElementById('cancelPasswordBtn').addEventListener('click', closePasswordModal);
passwordOverlay.addEventListener('click', event => {
  if (event.target === passwordOverlay) closePasswordModal();
});

document.getElementById('changePasswordForm').addEventListener('submit', async event => {
  event.preventDefault();
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;
  changePasswordError.textContent = '';

  if (newPassword !== confirmNewPassword) {
    changePasswordError.textContent = 'Yeni şifrələr eyni deyil';
    return;
  }

  try {
    const response = await fetch(`${API}/api/auth/change-password`, {
      method: 'PUT',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      changePasswordError.textContent = data.message || 'Şifrə dəyişdirilə bilmədi';
      return;
    }

    closePasswordModal();
    clearSession();
    showLogin();
    showToast('Şifrə dəyişdirildi. Yeni şifrə ilə yenidən daxil olun.');
  } catch {
    changePasswordError.textContent = 'Serverlə əlaqə qurula bilmədi';
  }
});

// ============== MƏHSUL SİYAHISI ==============
let allProducts = [];
let productSearchQuery = '';
let selectedIds = new Set(); // toplu seçim üçün

async function loadProducts() {
  try {
    const res = await fetch(`${API}/api/products`);
    if (!res.ok) throw new Error();
    allProducts = await res.json();
    syncAdminColorPaletteFromProducts(allProducts);
    // artıq mövcud olmayan id-ləri seçimdən təmizlə
    const validIds = new Set(allProducts.map(p => p.id));
    selectedIds.forEach(id => { if (!validIds.has(id)) selectedIds.delete(id); });
    renderProducts();
  } catch {
    showToast('Məhsullar yüklənmədi');
  }
}

function stockTag(stock) {
  if (stock <= 0) return `<span class="stock-tag stock-out">Bitib</span>`;
  if (stock <= 5) return `<span class="stock-tag stock-low">${stock} ədəd</span>`;
  return `<span class="stock-tag stock-ok">${stock} ədəd</span>`;
}

function categoryCell(p) {
  const main = escapeHtml(p.category || '');
  const sub = escapeHtml(p.subcategory || '');
  if (!sub) return `<span class="cat-tag"><b>${main}</b></span>`;
  return `<span class="cat-tag"><b>${main}</b> / ${sub}</span>`;
}

function renderProducts() {
  const tbody = document.getElementById('prodTbody');
  const empty = document.getElementById('emptyState');
  const table = document.getElementById('prodTable');
  const query = productSearchQuery.trim().toLocaleLowerCase('az');
  const visibleProducts = query ? allProducts.filter(p =>
    [p.name, p.brand, p.category, p.subcategory]
      .some(value => String(value || '').toLocaleLowerCase('az').includes(query))
  ) : allProducts;

  document.getElementById('prodCount').textContent = query
    ? `${visibleProducts.length} / ${allProducts.length} məhsul`
    : `${allProducts.length} məhsul`;

  if (allProducts.length === 0 || visibleProducts.length === 0) {
    table.style.display = 'none';
    empty.style.display = 'block';
    empty.textContent = allProducts.length === 0
      ? 'Hələ məhsul yoxdur. "+ Məhsul əlavə et" düyməsi ilə başla.'
      : 'Axtarışa uyğun məhsul tapılmadı.';
    updateBulkBar();
    return;
  }
  table.style.display = 'table';
  empty.style.display = 'none';

  tbody.innerHTML = visibleProducts.map(p => `
    <tr class="${selectedIds.has(p.id) ? 'row-selected' : ''}" data-id="${p.id}">
      <td><input type="checkbox" class="row-check" data-id="${p.id}" ${selectedIds.has(p.id) ? 'checked' : ''}></td>
      <td><img class="prod-thumb" src="${p.image || ''}" onerror="this.style.visibility='hidden'"></td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.brand || '—')}</td>
      <td>${categoryCell(p)}</td>
      <td>${p.price.toFixed(2)} ₼</td>
      <td>${stockTag(p.stock)}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" title="Kopyala" onclick="openCopy(${p.id})">⧉</button>
          <button class="icon-btn" title="Redaktə et" onclick="openEdit(${p.id})">✎</button>
          <button class="icon-btn danger" title="Sil" onclick="deleteProduct(${p.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');

  // checkbox-lara hadisə dinləyiciləri
  tbody.querySelectorAll('.row-check').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = Number(cb.dataset.id);
      if (cb.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      cb.closest('tr').classList.toggle('row-selected', cb.checked);
      updateBulkBar();
    });
  });

  updateBulkBar();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ============== HAMISINI SEÇ / SEÇİLƏNİ SİL ==============
function updateBulkBar() {
  const total = allProducts.length;
  const selCount = selectedIds.size;

  const selectAllCb = document.getElementById('selectAllCheckbox');
  const headCb = document.getElementById('headCheckbox');
  const delBtn = document.getElementById('deleteSelectedBtn');
  const countEl = document.getElementById('selCount');

  const allSelected = total > 0 && selCount === total;
  selectAllCb.checked = allSelected;
  selectAllCb.indeterminate = selCount > 0 && !allSelected;
  headCb.checked = allSelected;
  headCb.indeterminate = selCount > 0 && !allSelected;

  delBtn.disabled = selCount === 0;
  if (selCount > 0) {
    countEl.style.display = 'inline-flex';
    countEl.textContent = selCount;
  } else {
    countEl.style.display = 'none';
  }
}

function setAllSelection(checked) {
  selectedIds = new Set(checked ? allProducts.map(p => p.id) : []);
  renderProducts();
}

document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
  setAllSelection(e.target.checked);
});
document.getElementById('headCheckbox').addEventListener('change', (e) => {
  setAllSelection(e.target.checked);
});

document.getElementById('deleteSelectedBtn').addEventListener('click', async () => {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;

  const ok = confirm(
    ids.length === 1
      ? 'Seçilmiş məhsulu silmək istədiyinə əminsən?'
      : `Seçilmiş ${ids.length} məhsulu silmək istədiyinə əminsən?`
  );
  if (!ok) return;

  const delBtn = document.getElementById('deleteSelectedBtn');
  delBtn.disabled = true;

  try {
    const results = await Promise.allSettled(
      ids.map(id => fetch(`${API}/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      }))
    );

    const failed = results.filter(r => r.status === 'rejected' || (r.value && !r.value.ok)).length;
    const succeeded = ids.length - failed;

    selectedIds.clear();

    if (failed === 0) {
      showToast(succeeded === 1 ? 'Məhsul silindi' : `${succeeded} məhsul silindi`);
    } else if (succeeded === 0) {
      showToast('Silmək mümkün olmadı');
    } else {
      showToast(`${succeeded} silindi, ${failed} alınmadı`);
    }

    loadProducts();
  } catch {
    showToast('Silmək mümkün olmadı');
  } finally {
    delBtn.disabled = selectedIds.size === 0;
  }
});

function populateMainCategorySelect() {
  const sel = document.getElementById('f_category');
  sel.innerHTML = '<option value="">Seçin...</option>' +
    ADMIN_CATEGORY_LIST.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
}
const ADMIN_BRAND_LIST = [
  "2E", "Acer", "AEG", "Alarko", "Anbernic", "Apple", "Arçelik",
  "Ardesto", "Askona", "ASUS", "AUX", "Ayaneo", "Beko", "BergHOFF",
  "Biryusa", "Blackview", "BORK", "Bosch", "Braun", "Canon", "Chicco",
  "Dell", "De'Longhi", "Doogee", "Dreame", "Dyson", "Electrolux", "Euroacs", "Euroklimat",
  "Fakir", "Fieldmann", "Fujiaire", "Gorenje", "Graft", "Gree", "Haier",
  "HANN", "Hisense", "HOFFMANN", "Honor", "HP", "HUAWEI", "Infinix", "JBL", "JVC",
  "Karcher", "Keman", "Kenwood", "Komfy", "LEGO", "Lenovo", "LG", "Logitech",
  "MDV", "Microsoft", "Midea", "Mitsubishi", "Miyoo", "Motorola", "MSI",
  "Moulinex", "MyChoice", "Nintendo", "Nutribullet", "OPPO", "Ormatek", "Oukitel", "P.I.T.",
  "Pamer", "Panasonic", "Philips", "PlayStation", "Porodo", "Rampage", "Realme", "Remington",
  "Roborock", "Royal", "Rowenta", "Samsung", "Schaffer", "Sencor", "Shark", "Sharp",
  "Skyworth", "Sony", "Stadler Form", "Stanley", "SVEN", "Stihl", "TCL", "Tefal", "Toshiba", "Total", "TP-LINK",
  "WMF", "WOKIN", "Xiaomi", "Zanussi"
].sort((a, b) => a.localeCompare(b, 'az', { sensitivity: 'base' }));

function populateBrandSelect(selectedBrand = '') {
  const select = document.getElementById('f_brand');
  if (!select) return;

  select.innerHTML = '<option value="">Brendsiz</option>' +
    ADMIN_BRAND_LIST.map(brand =>
      `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`
    ).join('');

  if (selectedBrand) {
    select.value = selectedBrand;
    // Bazada siyahıya sonradan əlavə edilmiş köhnə brend varsa, redaktədə itməsin.
    if (select.value !== selectedBrand) {
      const option = document.createElement('option');
      option.value = selectedBrand;
      option.textContent = selectedBrand;
      select.appendChild(option);
      select.value = selectedBrand;
    }
  }
}

function populateSubcategorySelect(mainCategory, selectedSub) {
  const subSel = document.getElementById('f_subcategory');
  const groups = ADMIN_CATEGORY_TREE[mainCategory];

  if (!mainCategory || !groups) {
    subSel.innerHTML = '<option value="">Əvvəlcə əsas kateqoriya seçin</option>';
    subSel.disabled = true;
    renderCategorySpecs({});
    return;
  }

  let html = '<option value="">Seçin...</option>';
  groups.forEach(g => {
    // Qrupun items siyahısı boşdursa, qrupun özü alt-kateqoriya kimi seçilə bilər
    // (məs. "Gaming TV", "Uşaq üçün hava nəmləndiriciləri")
    if (!g.items || g.items.length === 0) {
      html += `<option value="${escapeHtml(g.group)}">${escapeHtml(g.group)}</option>`;
      return;
    }
    html += `<optgroup label="${escapeHtml(g.group)}">`;
    html += g.items.map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join('');
    html += `</optgroup>`;
  });
  subSel.innerHTML = html;
  subSel.disabled = false;

  if (selectedSub) {
    subSel.value = selectedSub;
    // əgər köhnə məlumatlarda olan alt-kateqoriya siyahıda yoxdursa, əl ilə əlavə et ki, itməsin
    if (subSel.value !== selectedSub) {
      const opt = document.createElement('option');
      opt.value = selectedSub;
      opt.textContent = selectedSub + ' (mövcud deyil)';
      subSel.appendChild(opt);
      subSel.value = selectedSub;
    }
  }

  renderCategorySpecs({});
}

function placementCategoryOptions(selected = '') {
  return '<option value="">Kateqoriya seçin...</option>' +
    ADMIN_CATEGORY_LIST.map(name =>
      `<option value="${escapeAttr(name)}" ${name === selected ? 'selected' : ''}>${escapeHtml(name)}</option>`
    ).join('');
}

function placementSubcategoryOptions(category, selected = '') {
  const groups = ADMIN_CATEGORY_TREE[category] || [];
  const items = groups.flatMap(group => group.items || []);
  return '<option value="">Alt-kateqoriya seçin...</option>' +
    items.map(name =>
      `<option value="${escapeAttr(name)}" ${name === selected ? 'selected' : ''}>${escapeHtml(name)}</option>`
    ).join('');
}

function addPlacementRow(value = {}) {
  const target = document.getElementById('additionalPlacements');
  const row = document.createElement('div');
  row.className = 'additional-placement-row';
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:10px;margin-bottom:10px;align-items:center;';
  row.innerHTML = `
    <select class="placement-category">${placementCategoryOptions(value.category || '')}</select>
    <select class="placement-subcategory" ${value.category ? '' : 'disabled'}>
      ${placementSubcategoryOptions(value.category || '', value.subcategory || '')}
    </select>
    <button type="button" class="icon-btn placement-remove" title="Sil">×</button>`;
  row.querySelector('.placement-category').addEventListener('change', event => {
    const sub = row.querySelector('.placement-subcategory');
    sub.innerHTML = placementSubcategoryOptions(event.target.value);
    sub.disabled = !event.target.value;
  });
  row.querySelector('.placement-remove').addEventListener('click', () => row.remove());
  target.appendChild(row);
}

function renderAdditionalPlacements(placements = [], primary = {}) {
  const target = document.getElementById('additionalPlacements');
  target.innerHTML = '';
  placements
    .filter(item => item.category !== primary.category || (item.subcategory || '') !== (primary.subcategory || ''))
    .forEach(addPlacementRow);
}

function collectPlacements() {
  const primary = {
    category: document.getElementById('f_category').value,
    subcategory: document.getElementById('f_subcategory').value
  };
  const rows = [...document.querySelectorAll('.additional-placement-row')].map(row => ({
    category: row.querySelector('.placement-category').value,
    subcategory: row.querySelector('.placement-subcategory').value
  })).filter(item => item.category);
  return [primary, ...rows];
}

document.getElementById('addPlacementBtn').addEventListener('click', () => addPlacementRow());

document.getElementById('f_category').addEventListener('change', (e) => {
  preservedProductSpecs = { ...preservedProductSpecs, ...collectCategorySpecs() };
  populateSubcategorySelect(e.target.value, '');
  renderCategorySpecs(preservedProductSpecs);
});

document.getElementById('f_subcategory').addEventListener('change', () => {
  preservedProductSpecs = { ...preservedProductSpecs, ...collectCategorySpecs() };
  renderCategorySpecs(preservedProductSpecs);
});

function activeSpecificationTemplate() {
  const selectedSubcategory = document.getElementById('f_subcategory').value.trim();
  const subcategory = selectedSubcategory.toLocaleLowerCase('az');
  if (subcategory === 'qoruyucu örtük' || subcategory === 'apple qoruyucu örtükləri') {
    return { title: 'Qoruyucu örtük xüsusiyyətləri', groups: PROTECTIVE_CASE_SPEC_GROUPS };
  }
  if (subcategory === 'smart saatlar' || subcategory === 'apple smart saatları') {
    return { title: 'Smart saat xüsusiyyətləri', groups: SMARTWATCH_SPEC_GROUPS };
  }
  if (subcategory === 'smartfonlar' || subcategory === 'apple smartfonları') {
    return { title: 'Smartfon xüsusiyyətləri', groups: SMARTPHONE_SPEC_GROUPS };
  }
  if (subcategory === 'oyun smartfonları') {
    return { title: 'Oyun smartfonu xüsusiyyətləri', groups: SMARTPHONE_SPEC_GROUPS };
  }
  
  if (subcategory === 'tws simsiz qulaqlıqlar') {
    return { title: 'TWS simsiz qulaqlıq xüsusiyyətləri', groups: TWS_HEADPHONE_SPEC_GROUPS };
  }
  if (subcategory === 'simli qulaqlıqlar') {
    return { title: 'Simli qulaqlıq xüsusiyyətləri', groups: WIRED_HEADPHONE_SPEC_GROUPS };
  }
  if (subcategory === 'bluetooth simsiz qulaqlıqlar') {
    return { title: 'Bluetooth simsiz qulaqlıq xüsusiyyətləri', groups: BLUETOOTH_HEADPHONE_SPEC_GROUPS };
  }
  if (subcategory === 'planşetlər' || subcategory === 'apple planşetləri') {
    return { title: 'Planşet xüsusiyyətləri', groups: TABLET_SPEC_GROUPS };
  }
  if (subcategory === 'kondisionerlər') {
    return { title: 'Kondisioner xüsusiyyətləri', groups: AIR_CONDITIONER_SPEC_GROUPS };
  }
  if (subcategory === 'ventilyatorlar') {
    return { title: 'Ventilyator xüsusiyyətləri', groups: FAN_SPEC_GROUPS };
  }
  if (subcategory === 'dispenserlər') {
    return { title: 'Dispenser xüsusiyyətləri', groups: DISPENSER_SPEC_GROUPS };
  }
  if (subcategory === 'aspiratorlar') {
    return { title: 'Aspirator xüsusiyyətləri', groups: HOOD_SPEC_GROUPS };
  }
  if (subcategory === 'tozsoranlar') {
    return { title: 'Tozsoran xüsusiyyətləri', groups: VACUUM_SPEC_GROUPS };
  }
  if (subcategory === 'oyun konsolları') {
    return { title: 'Oyun konsolu xüsusiyyətləri', groups: GAME_CONSOLE_SPEC_GROUPS };
  }
  if (subcategory === 'oyun monitorları') {
    return { title: 'Oyun monitoru xüsusiyyətləri', groups: GAMING_MONITOR_SPEC_GROUPS };
  }
  if (subcategory === 'oyun manipulyatorları') {
    return { title: 'Oyun manipulyatoru xüsusiyyətləri', groups: GAMING_CONTROLLER_SPEC_GROUPS };
  }
  if (subcategory === 'notbuklar' || subcategory === 'oyun notbukları') {
    return {
      title: subcategory === 'oyun notbukları'
        ? 'Oyun notbuku xüsusiyyətləri'
        : 'Notbuk xüsusiyyətləri',
      groups: GAMING_LAPTOP_SPEC_GROUPS
    };
  }
  if (
    subcategory === 'gaming tv' ||
    subcategory === 'tv brend üzrə'
  ) {
    return {
      title: 'TV xüsusiyyətləri',
      groups: TV_SPEC_GROUPS
    };
  }
  if (subcategory === 'oyun routerləri') {
    return { title: 'Oyun routeri xüsusiyyətləri', groups: GAMING_ROUTER_SPEC_GROUPS };
  }
  if (subcategory === 'oyun diskləri') {
    return { title: 'Oyun diski xüsusiyyətləri', groups: GAME_DISC_SPEC_GROUPS };
  }
  if (subcategory === 'uşaq üçün hava nəmləndiriciləri') {
    return {
      title: 'Uşaq üçün hava nəmləndiricisi xüsusiyyətləri',
      groups: CHILD_HUMIDIFIER_SPEC_GROUPS,
      automaticProductType: 'Hava nəmləndirici'
    };
  }
  if (subcategory === 'paltaryuyan maşınlar') {
  return {
    title: 'Paltaryuyan maşın xüsusiyyətləri',
    groups: WASHING_MACHINE_SPEC_GROUPS
  };
}

if (subcategory === 'soyuducular') {
  return {
    title: 'Soyuducu xüsusiyyətləri',
    groups: FRIDGE_SPEC_GROUPS
  };
}
  const airTreatmentTypes = [
    'hava nəmləndirici',
    'hava təmizləyici',
    'hava təravətləndirici'
  ];
  if (airTreatmentTypes.includes(subcategory) || subcategory.startsWith('iqlim kompleksi')) {
    return {
      title: `${selectedSubcategory} xüsusiyyətləri`,
      groups: AIR_TREATMENT_SPEC_GROUPS,
      automaticType: subcategory.startsWith('iqlim kompleksi')
        ? 'İqlim kompleksi (Hava təmizləyici və nəmləndirici)'
        : selectedSubcategory
    };
  }
  return null;
}

function escapeAttr(value) {
  return escapeHtml(String(value)).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderCategorySpecs(values = {}) {
  const panel = document.getElementById('categorySpecsPanel');
  const title = document.getElementById('categorySpecsTitle');
  const target = document.getElementById('categorySpecsFields');
  const template = activeSpecificationTemplate();
  panel.classList.toggle('visible', Boolean(template));

  if (!template) {
    target.innerHTML = '';
    return;
  }

  title.textContent = template.title;
  target.innerHTML = template.groups.map(group => `
    <div class="spec-group">
      <h5>${escapeHtml(group.title)}</h5>
      <div class="spec-grid">
        ${group.fields.map(field => {
          const value = values[field.key] || '';
          if (field.type === 'areaRange') {
            const rangeValues = String(value).match(/\d+(?:[.,]\d+)?/g) || [];
            return `<div class="field">
              <label>${escapeHtml(field.label || field.key)}</label>
              <div class="category-spec-range" data-spec-key="${escapeAttr(field.key)}"
                style="display:grid;grid-template-columns:1fr auto 1fr auto;align-items:center;gap:8px;">
                <input type="number" min="0" step="1" class="category-spec-range-min"
                  value="${escapeAttr(rangeValues[0] || '')}" placeholder="25">
                <span style="font-weight:700;color:#64748b;">-</span>
                <input type="number" min="0" step="1" class="category-spec-range-max"
                  value="${escapeAttr(rangeValues[1] || '')}" placeholder="45">
                <span style="font-weight:600;color:#64748b;white-space:nowrap;">m²</span>
              </div>
            </div>`;
          }
          if (field.type === 'boolean' || field.options) {
            const options = field.type === 'boolean' ? ['Var', 'Yox'] : field.options;
            return `<div class="field">
              <label>${escapeHtml(field.label || field.key)}</label>
              <select class="category-spec-input" data-spec-key="${escapeAttr(field.key)}">
                <option value="">Seçin...</option>
                ${options.map(option =>
                  `<option value="${escapeAttr(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(option)}</option>`
                ).join('')}
              </select>
            </div>`;
          }
          return `<div class="field">
            <label>${escapeHtml(field.label || field.key)}</label>
            <input class="category-spec-input" data-spec-key="${escapeAttr(field.key)}"
              value="${escapeAttr(value)}" placeholder="${escapeAttr(field.placeholder || '')}">
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function collectCategorySpecs() {
  const template = activeSpecificationTemplate();
  if (!template) return {};
  const specs = {};
  if (template.automaticType) specs['Növ'] = template.automaticType;
  if (template.automaticProductType) specs['Məhsul növü'] = template.automaticProductType;
  document.querySelectorAll('.category-spec-input').forEach(input => {
    const value = input.value.trim();
    if (value) specs[input.dataset.specKey] = value;
  });
  document.querySelectorAll('.category-spec-range').forEach(range => {
    const min = range.querySelector('.category-spec-range-min').value.trim();
    const max = range.querySelector('.category-spec-range-max').value.trim();
    if (min && max) specs[range.dataset.specKey] = `${min}-${max} m²`;
  });
  return specs;
}

// ============== RƏNG SEÇİCİSİ ==============
let selectedProductColors = [];
const ADMIN_COLOR_PALETTE_KEY = 'admin-color-palette';
let adminColorPalette = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(ADMIN_COLOR_PALETTE_KEY) || 'null');
    return Array.isArray(saved) && saved.length ? saved : COLOR_PALETTE.map(c => ({ name: c.name, hex: c.hex }));
  } catch {
    return COLOR_PALETTE.map(c => ({ name: c.name, hex: c.hex }));
  }
})();

function saveAdminColorPalette() {
  localStorage.setItem(ADMIN_COLOR_PALETTE_KEY, JSON.stringify(adminColorPalette));
}

function sameColor(a, b) {
  return a.name.toLocaleLowerCase('az') === b.name.toLocaleLowerCase('az') &&
    a.hex.toLocaleLowerCase('az') === b.hex.toLocaleLowerCase('az');
}

function normalizeColor(color) {
  if (typeof color === 'object' && color) return color;
  const raw = String(color || '').trim();
  const separator = raw.lastIndexOf('|');
  if (separator > 0) {
    return { name: raw.slice(0, separator).trim(), hex: raw.slice(separator + 1).trim() };
  }
  const paletteColor = COLOR_PALETTE.find(c => c.name.toLocaleLowerCase('az') === raw.toLocaleLowerCase('az'));
  return { name: raw, hex: paletteColor?.hex || (raw.startsWith('#') ? raw : '#9ca3af') };
}

function renderColorPicker(selectedColors = []) {
  selectedProductColors = selectedColors.map(normalizeColor).filter(c => c.name);
  selectedProductColors.forEach(color => {
    if (!adminColorPalette.some(c => sameColor(c, color))) {
      adminColorPalette.push({ name: color.name, hex: color.hex });
    }
  });
  saveAdminColorPalette();
  const wrap = document.getElementById('colorPicker');
  wrap.innerHTML = adminColorPalette.map((c, index) => {
    const selected = selectedProductColors.some(item => sameColor(item, c));
    return `
    <span class="editable-color" title="${escapeAttr(c.name)} (${escapeAttr(c.hex)})">
      <button type="button" class="color-swatch${selected ? ' selected' : ''}" data-select-color="${index}" style="display:block;background:${escapeAttr(c.hex)}" aria-label="${escapeAttr(c.name)} rəngini seç"></button>
      <button type="button" class="remove-color" data-remove-color="${index}" aria-label="${escapeAttr(c.name)} rəngini sil">×</button>
    </span>`;
  }).join('');
  wrap.querySelectorAll('[data-select-color]').forEach(button => {
    button.addEventListener('click', () => {
      const color = adminColorPalette[Number(button.dataset.selectColor)];
      const selectedIndex = selectedProductColors.findIndex(c => sameColor(c, color));
      if (selectedIndex >= 0) selectedProductColors.splice(selectedIndex, 1);
      else selectedProductColors.push({ name: color.name, hex: color.hex });
      renderColorPicker(selectedProductColors);
    });
  });
  wrap.querySelectorAll('[data-remove-color]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      const removed = adminColorPalette.splice(Number(button.dataset.removeColor), 1)[0];
      selectedProductColors = selectedProductColors.filter(c => !sameColor(c, removed));
      saveAdminColorPalette();
      renderColorPicker(selectedProductColors);
    });
  });
  syncColorsHidden();
}

function syncColorsHidden() {
  document.getElementById('f_colors').value = selectedProductColors
    .map(c => `${c.name}|${c.hex}`)
    .join(', ');
}

function parseColorsString(str) {
  if (!str) return [];
  return str.split(',').map(s => normalizeColor(s)).filter(c => c.name);
}

function syncAdminColorPaletteFromProducts(products) {
  let changed = false;
  products.forEach(product => {
    parseColorsString(product.colors).forEach(color => {
      if (!adminColorPalette.some(item => sameColor(item, color))) {
        adminColorPalette.push({ name: color.name, hex: color.hex });
        changed = true;
      }
    });
  });
  if (changed) saveAdminColorPalette();
}

document.getElementById('addCustomColorBtn').addEventListener('click', () => {
  const nameInput = document.getElementById('customColorName');
  const hexInput = document.getElementById('customColorHex');
  const name = nameInput.value.trim();
  const hex = hexInput.value.trim().toUpperCase();
  if (!name) {
    showToast('Rəng adını yazın');
    nameInput.focus();
    return;
  }
  if (!/^#[0-9A-F]{6}$/.test(hex)) {
    showToast('HEX kodu #RRGGBB formatında yazın');
    hexInput.focus();
    return;
  }
  const newColor = { name, hex };
  if (!selectedProductColors.some(c => sameColor(c, newColor))) selectedProductColors.push(newColor);
  if (!adminColorPalette.some(c => sameColor(c, newColor))) adminColorPalette.push(newColor);
  saveAdminColorPalette();
  nameInput.value = '';
  renderColorPicker(selectedProductColors);
});

document.getElementById('customColorVisual').addEventListener('input', event => {
  document.getElementById('customColorHex').value = event.target.value.toUpperCase();
});
document.getElementById('customColorHex').addEventListener('input', event => {
  const value = event.target.value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    document.getElementById('customColorVisual').value = value;
  }
});

// ============== MODAL AÇMA/BAĞLAMA ==============
const overlay = document.getElementById('overlay');
const form = document.getElementById('productForm');
const SPEC_DRAFT_PREFIX = 'admin-product-specs:';
let preservedProductSpecs = {};
let managedImages = [];
let nextImageKey = 1;

function clearManagedImages() {
  managedImages.forEach(item => { if (item.objectUrl) URL.revokeObjectURL(item.objectUrl); });
  managedImages = [];
  nextImageKey = 1;
  document.getElementById('f_image').value = '';
  renderManagedImages();
}

function setManagedImagesFromProduct(product) {
  clearManagedImages();
  const images = Array.isArray(product.images) && product.images.length
    ? product.images
    : (product.image ? [{ id: null, url: product.image, isPrimary: true }] : []);
  managedImages = images.slice(0, 10).map((item, index) => ({
    key: item.id ? `existing:${item.id}` : `legacy:${index}`,
    id: item.id || null,
    url: item.url || item.image || product.image,
    existing: Boolean(item.id),
    isPrimary: Boolean(item.isPrimary) || index === 0
  }));
  if (!managedImages.some(item => item.isPrimary) && managedImages[0]) managedImages[0].isPrimary = true;
  renderManagedImages();
}

function renderManagedImages() {
  const target = document.getElementById('imagePreviews');
  document.getElementById('imageCount').textContent = `${managedImages.length} / 10 şəkil`;
  target.innerHTML = managedImages.map(item => `
    <div class="image-preview-card${item.isPrimary ? ' primary' : ''}">
      <img src="${escapeAttr(item.url)}" alt="Məhsul şəkli">
      <div class="image-preview-actions">
        <button type="button" class="${item.isPrimary ? 'active' : ''}" data-main-image="${escapeAttr(item.key)}">${item.isPrimary ? 'Əsas şəkil' : 'Əsas et'}</button>
        <button type="button" class="remove" data-remove-image="${escapeAttr(item.key)}" title="Şəkli sil">×</button>
      </div>
    </div>
  `).join('');
  target.querySelectorAll('[data-main-image]').forEach(button => button.addEventListener('click', () => {
    managedImages.forEach(item => { item.isPrimary = item.key === button.dataset.mainImage; });
    renderManagedImages();
  }));
  target.querySelectorAll('[data-remove-image]').forEach(button => button.addEventListener('click', () => {
    const index = managedImages.findIndex(item => item.key === button.dataset.removeImage);
    if (index < 0) return;
    const [removed] = managedImages.splice(index, 1);
    if (removed.objectUrl) URL.revokeObjectURL(removed.objectUrl);
    if (removed.isPrimary && managedImages[0]) managedImages[0].isPrimary = true;
    renderManagedImages();
  }));
}

function saveSpecsDraft(productId, specs) {
  try {
    localStorage.setItem(SPEC_DRAFT_PREFIX + productId, JSON.stringify(specs || {}));
  } catch {}
}

function readSpecsDraft(productId) {
  try {
    return JSON.parse(localStorage.getItem(SPEC_DRAFT_PREFIX + productId) || '{}');
  } catch {
    return {};
  }
}

function openCreate() {
  form.reset();
  preservedProductSpecs = {};
  overlay.style.display = 'flex';
  document.getElementById('productId').value = '';
  document.getElementById('modalTitle').textContent = 'Yeni məhsul';
  clearManagedImages();
  populateSubcategorySelect('', ''); // alt-kateqoriya sıfırlanır və deaktiv olur
  populateBrandSelect('');
  renderColorPicker([]);
  renderAdditionalPlacements([]);
}

function openEdit(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  form.reset();
  overlay.style.display = 'flex';
  document.getElementById('productId').value = p.id;
  document.getElementById('modalTitle').textContent = 'Məhsulu redaktə et';
  document.getElementById('f_name').value = p.name;
  document.getElementById('f_nameRu').value = p.nameRu;
  document.getElementById('f_description').value = p.description;
  document.getElementById('f_descRu').value = p.descRu;
  document.getElementById('f_price').value = p.price;
  document.getElementById('f_oldPrice').value = p.oldPrice || '';
  document.getElementById('f_category').value = p.category;
  populateSubcategorySelect(p.category, p.subcategory || '');
  const savedSpecs = p.specs && Object.keys(p.specs).length
    ? p.specs
    : readSpecsDraft(p.id);
  preservedProductSpecs = { ...savedSpecs };
  renderCategorySpecs(savedSpecs);
  renderAdditionalPlacements(p.placements || [], {
    category: p.category,
    subcategory: p.subcategory || ''
  });
  populateBrandSelect(p.brand || '');
  document.getElementById('f_stock').value = p.stock;
  document.getElementById('f_discount').value = p.discount || '';
  document.getElementById('f_installment').value = p.installment || '';

  renderColorPicker(parseColorsString(p.colors));

  setManagedImagesFromProduct(p);
}

function openCopy(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  openEdit(id);
  document.getElementById('productId').value = '';
  document.getElementById('modalTitle').textContent = 'Məhsulu kopyala';
  clearManagedImages();
  document.getElementById('imageHint').textContent = 'Bu kopyadır. Yeni məhsul üçün 10-a qədər şəkil seçin.';
}

function closeModal() {
  overlay.style.display = 'none';
}
document.getElementById('productSearchInput').addEventListener('input', event => {
  productSearchQuery = event.target.value;
  renderProducts();
});

document.getElementById('newProductBtn').addEventListener('click', openCreate);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

document.getElementById('f_image').addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  const available = 10 - managedImages.length;
  if (files.length > available) showToast(`Maksimum 10 şəkil olar. Yalnız ${available} şəkil əlavə edilə bilər.`);
  files.slice(0, available).forEach(file => {
    if (file.size > 5 * 1024 * 1024) return showToast(`${file.name}: şəkil 5 MB-dan böyükdür`);
    const key = `new:${nextImageKey++}`;
    const objectUrl = URL.createObjectURL(file);
    managedImages.push({ key, file, url: objectUrl, objectUrl, existing: false, isPrimary: managedImages.length === 0 });
  });
  e.target.value = '';
  renderManagedImages();
});

// ============== YADDA SAXLA (CREATE / UPDATE) ==============
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const saveBtn = document.getElementById('saveBtn');

  const fd = new FormData();
  fd.append('name', document.getElementById('f_name').value);
  fd.append('nameRu', document.getElementById('f_nameRu').value);
  fd.append('description', document.getElementById('f_description').value);
  fd.append('descRu', document.getElementById('f_descRu').value);
  fd.append('price', document.getElementById('f_price').value);
  fd.append('category', document.getElementById('f_category').value);
  fd.append('subcategory', document.getElementById('f_subcategory').value);
  fd.append('placements', JSON.stringify(collectPlacements()));
  fd.append('brand', document.getElementById('f_brand').value);
  const collectedSpecs = { ...preservedProductSpecs, ...collectCategorySpecs() };
  fd.append('specs', JSON.stringify(collectedSpecs));
  saveSpecsDraft(id || 'new', collectedSpecs);
  fd.append('stock', document.getElementById('f_stock').value);

  const oldPrice = document.getElementById('f_oldPrice').value;
  const discount = document.getElementById('f_discount').value;
  const installment = document.getElementById('f_installment').value;
  const colors = document.getElementById('f_colors').value;
  if (oldPrice) fd.append('oldPrice', oldPrice);
  if (discount) fd.append('discount', discount);
  if (installment) fd.append('installment', installment);
  if (colors) fd.append('colors', colors);

  const existingImageIds = managedImages.filter(item => item.existing).map(item => item.id);
  const newImages = managedImages.filter(item => item.file);
  fd.append('existingImageIds', JSON.stringify(existingImageIds));
  fd.append('newImageKeys', JSON.stringify(newImages.map(item => item.key)));
  fd.append('primaryImageKey', managedImages.find(item => item.isPrimary)?.key || '');
  newImages.forEach(item => fd.append('images', item.file, item.file.name));

  const url = id ? `${API}/api/admin/products/${id}` : `${API}/api/admin/products`;
  const method = id ? 'PUT' : 'POST';

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saxlanılır...';

  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(), // Content-Type-i təyin etmə, FormData özü qoyur
      body: fd
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || 'Xəta baş verdi');
      return;
    }

    showToast(id ? 'Məhsul yeniləndi' : 'Məhsul əlavə olundu');
    saveSpecsDraft(data.id, collectedSpecs);
    if (!id) localStorage.removeItem(SPEC_DRAFT_PREFIX + 'new');
    closeModal();
    loadProducts();
  } catch {
    showToast('Serverlə əlaqə qurula bilmədi');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Yadda saxla';
  }
});

// ============== SİLMƏ (tək məhsul) ==============
async function deleteProduct(id) {
  if (!confirm('Bu məhsulu silmək istədiyinə əminsən?')) return;
  try {
    const res = await fetch(`${API}/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error();
    selectedIds.delete(id);
    showToast('Məhsul silindi');
    loadProducts();
  } catch {
    showToast('Silmək mümkün olmadı');
  }
}

// ============== BAŞLANĞIC ==============
(function init() {
  populateMainCategorySelect();
  populateBrandSelect();

  const token = getToken();
  const user = getUser();
  if (token && user && user.role === 'admin') {
    showApp();
  } else {
    showLogin();
  }
})();
