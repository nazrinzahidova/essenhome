/* Shared account controls use the existing token and favourites page. */
(() => {
  const button = document.getElementById('openLoginModal');
  if (!button) return;
  const menu = document.createElement('div');
  menu.id = 'essen-account-menu';
  menu.hidden = true;
  menu.innerHTML = '<a href="/profile.html">Şəxsi məlumatlarım</a><a href="/favourites.html">Seçilmişlər</a><button type="button" data-logout>Çıxış</button>';
  document.body.append(menu);
  const token = () => localStorage.getItem('token');
  function closeMenu() { menu.hidden = true; button.setAttribute('aria-expanded', 'false'); }
  function positionMenu() {
    const rect = button.getBoundingClientRect();
    menu.style.right = Math.max(12, window.innerWidth - rect.right) + 'px';
    menu.style.top = Math.min(rect.bottom + 8, window.innerHeight - menu.offsetHeight - 12) + 'px';
  }
  function refresh() {
    button.classList.remove('logged-in');
    button.classList.add('essen-user-icon');
    button.classList.toggle('is-authenticated', Boolean(token()));
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20v-1a7 7 0 0 1 14 0v1"/></svg>';
    button.setAttribute('aria-label', token() ? 'Hesab' : 'Daxil ol');
    button.setAttribute('aria-controls', menu.id);
    button.setAttribute('aria-expanded', 'false');
    closeMenu();
  }
  function clearSession() {
    if (typeof window.clearExpiredHomepageSession === 'function') window.clearExpiredHomepageSession();
    else if (typeof window.clearExpiredSession === 'function') window.clearExpiredSession();
    else ['token', 'activeUser', 'userRole', 'user'].forEach(key => localStorage.removeItem(key));
    window.dispatchEvent(new Event('essen:logout'));
    refresh();
  }
  button.addEventListener('click', event => {
    if (!token()) return;
    event.preventDefault(); event.stopImmediatePropagation();
    menu.hidden = !menu.hidden;
    button.setAttribute('aria-expanded', String(!menu.hidden));
    if (!menu.hidden) positionMenu();
  }, true);
  function logout() { clearSession(); window.location.href = '/index.html'; }
  menu.querySelector('[data-logout]').addEventListener('click', logout);
  document.querySelectorAll('[data-account-logout]').forEach(item => item.addEventListener('click', logout));
  document.addEventListener('click', event => { if (!menu.contains(event.target) && !button.contains(event.target)) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { closeMenu(); button.focus(); } });
  document.addEventListener('focusin', event => { if (!menu.hidden && !menu.contains(event.target) && !button.contains(event.target)) closeMenu(); });
  window.addEventListener('resize', closeMenu);
  window.addEventListener('scroll', closeMenu, true);
  window.addEventListener('essen:login', refresh);
  window.addEventListener('essen:logout', refresh);
  window.addEventListener('storage', event => { if (event.key === 'token' || event.key === null) { refresh(); } });
async function linkPreviousGuestChat() {
  const token=localStorage.getItem('token');
  if (!token) return;
  try { await fetch('/api/chats/link-guest',{method:'POST',credentials:'same-origin',headers:{Authorization:'Bearer '+token}}); } catch {}
}
window.addEventListener('essen:login',linkPreviousGuestChat);
linkPreviousGuestChat();


  refresh();
})();
