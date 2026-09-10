/* Shared account controls use the existing token and favourites page. */
(() => {
  const button = document.getElementById('openLoginModal');
  if (!button) return;
  const menu = document.createElement('div');
  menu.id = 'essen-account-menu';
  menu.hidden = true;
  menu.innerHTML = '<button type="button" data-profile>Şəxsi məlumatlarım</button><a href="/favourites.html">Seçilmişlər</a><button type="button" data-logout>Çıxış</button>';
  document.body.append(menu);
  const dialog = document.createElement('dialog');
  dialog.id = 'essen-profile';
  dialog.setAttribute('aria-labelledby', 'essen-profile-title');
  dialog.innerHTML = '<button type="button" class="essen-profile-close" aria-label="Bağla">×</button><h2 id="essen-profile-title">Şəxsi məlumatlarım</h2><p role="status"></p><dl hidden></dl><button type="button" data-retry hidden>Yenidən cəhd et</button>';
  document.body.append(dialog);
  const status = dialog.querySelector('[role=status]');
  const fields = dialog.querySelector('dl');
  const retry = dialog.querySelector('[data-retry]');
  let controller;
  const token = () => localStorage.getItem('token');
  function closeMenu() { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); }
  function positionMenu() {
    const rect = button.getBoundingClientRect();
    menu.style.right = Math.max(12, window.innerWidth - rect.right) + 'px';
    menu.style.top = Math.min(rect.bottom + 8, window.innerHeight - menu.offsetHeight - 12) + 'px';
  }
  function refresh() {
    button.classList.remove('logged-in');
    button.setAttribute('aria-label', token() ? 'Hesab' : 'Daxil ol');
    button.setAttribute('aria-controls', menu.id);
    button.setAttribute('aria-expanded', 'false');
    closeMenu();
  }
  function clearSession() {
    if (typeof window.clearExpiredHomepageSession === 'function') window.clearExpiredHomepageSession();
    else if (typeof window.clearExpiredSession === 'function') window.clearExpiredSession();
    else ['token', 'activeUser', 'userRole', 'user'].forEach(key => localStorage.removeItem(key));
    controller?.abort();
    fields.replaceChildren();
    dialog.close();
    refresh();
  }
  async function loadProfile() {
    controller?.abort();
    const requestController = controller = new AbortController();
    const sessionToken = token();
    const timeout = setTimeout(() => requestController.abort(), 20000);
    fields.replaceChildren(); fields.hidden = true; retry.hidden = true;
    status.textContent = 'Məlumatlar yüklənir…';
    try {
      const response = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + sessionToken }, cache: 'no-store', signal: requestController.signal });
      if (requestController !== controller || token() !== sessionToken || !dialog.open) return;
      if (response.status === 401) { clearSession(); button.click(); return; }
      const data = await response.json();
      if (requestController !== controller || token() !== sessionToken || !dialog.open) return;
      if (!response.ok) throw new Error(data.message || 'Məlumatlar yüklənə bilmədi.');
      for (const [key, label] of [['firstName','Ad'], ['lastName','Soyad'], ['birthDate','Doğum tarixi'], ['email','E-poçt'], ['phone','Telefon nömrəsi']]) {
        const group = document.createElement('div');
        const term = document.createElement('dt'); term.textContent = label;
        const value = document.createElement('dd');
        const raw = data.user[key];
        value.textContent = raw ? (key === 'birthDate' ? new Intl.DateTimeFormat('az-AZ', { timeZone: 'UTC' }).format(new Date(raw)) : raw) : 'Qeyd edilməyib';
        group.append(term, value); fields.append(group);
      }
      status.textContent = ''; fields.hidden = false;
    } catch (error) {
      if (requestController !== controller || !dialog.open) return;
      status.textContent = error.name === 'AbortError' ? 'Sorğu vaxtı bitdi. Yenidən cəhd edin.' : (error.message || 'Məlumatlar yüklənə bilmədi.');
      retry.hidden = false;
    } finally { clearTimeout(timeout); }
  }
  button.addEventListener('click', event => {
    if (!token()) return;
    event.preventDefault(); event.stopImmediatePropagation();
    menu.hidden = !menu.hidden;
    button.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) positionMenu();
  }, true);
  menu.querySelector('[data-profile]').addEventListener('click', () => { closeMenu(); dialog.showModal(); loadProfile(); });
  menu.querySelector('[data-logout]').addEventListener('click', () => { clearSession(); window.location.reload(); });
  retry.addEventListener('click', loadProfile);
  dialog.querySelector('.essen-profile-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { controller?.abort(); controller = null; fields.replaceChildren(); button.focus(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  document.addEventListener('click', event => { if (!menu.contains(event.target) && !button.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { closeMenu(); button.focus(); } });
  document.addEventListener('focusin', event => { if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) closeMenu(); });
  window.addEventListener('resize', closeMenu);
  window.addEventListener('scroll', closeMenu, true);
  window.addEventListener('essen:login', refresh);
  window.addEventListener('storage', event => { if (event.key === 'token' || event.key === null) { controller?.abort(); dialog.close(); fields.replaceChildren(); refresh(); } });
  refresh();
})();
