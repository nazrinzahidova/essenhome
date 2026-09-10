(() => {
  const form = document.getElementById('profile-form');
  const status = document.getElementById('profile-status');
  const retry = document.getElementById('profile-retry');
  const login = document.getElementById('profile-login');
  const save = document.getElementById('profile-save');
  const fieldset = document.getElementById('profile-fields');
  const keys = ['firstName','lastName','phone','birthDate','email'];
  const input = key => document.getElementById('profile-' + key);
  let controller, busy = false;
  input('birthDate').max = new Date().toLocaleDateString('en-CA');
  function message(text, state = '') { status.textContent = text; status.dataset.state = state; }
  function errors(values = {}) {
    for (const key of keys) {
      document.getElementById('error-' + key).textContent = values[key] || '';
      input(key).setAttribute('aria-invalid', String(Boolean(values[key])));
    }
  }
  function signedOut() {
    controller?.abort(); controller = null; form.reset(); form.hidden = true; retry.hidden = true; login.hidden = false;
    message('Şəxsi məlumatlarınıza baxmaq üçün hesabınıza daxil olun.');
  }
  async function request(method, body) {
    controller?.abort();
    const current = controller = new AbortController();
    const token = localStorage.getItem('token');
    const timer = setTimeout(() => current.abort(), 20000);
    try {
      const response = await fetch('/api/auth/me', { method, cache:'no-store', signal:current.signal,
        headers:{ Authorization:'Bearer ' + token, ...(body ? {'Content-Type':'application/json'} : {}) }, ...(body ? {body:JSON.stringify(body)} : {}) });
      const data = await response.json();
      if (controller !== current || token !== localStorage.getItem('token')) return null;
      if (response.status === 401) {
        ['token','activeUser','userRole','user'].forEach(key => localStorage.removeItem(key));
        window.dispatchEvent(new Event('essen:logout')); signedOut(); return null;
      }
      if (!response.ok) { errors(data.errors); throw new Error(data.message || 'Əməliyyat tamamlanmadı. Yenidən cəhd edin.'); }
      return data;
    } catch (error) {
      if (controller !== current || token !== localStorage.getItem('token')) return null;
      throw error;
    } finally { clearTimeout(timer); }
  }
  function fill(user) { for (const key of keys) input(key).value = key === 'birthDate' ? (user[key] || '').slice(0,10) : (user[key] || ''); }
  async function load() {
    if (!localStorage.getItem('token')) return signedOut();
    form.hidden = true; login.hidden = true; retry.hidden = true; errors(); message('Məlumatlar yüklənir…');
    try { const data = await request('GET'); if (!data) return; fill(data.user); form.hidden = false; message(''); }
    catch (error) { if (!localStorage.getItem('token')) return; message(error.name === 'AbortError' ? 'Sorğu vaxtı bitdi. Yenidən cəhd edin.' : error.message, 'error'); retry.hidden = false; }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    errors();
    if (!form.reportValidity()) return;
    busy = true; save.disabled = true; fieldset.disabled = true; save.textContent = 'Yadda saxlanılır…'; message('');
    try {
      const body = Object.fromEntries(['firstName','lastName','email','birthDate'].map(key => [key,input(key).value]));
      const data = await request('PUT', body); if (!data) return;
      fill(data.user);
      try { const cached=JSON.parse(localStorage.getItem('user') || '{}'); localStorage.setItem('user',JSON.stringify({...cached,...data.user,name:data.user.firstName+' '+data.user.lastName})); localStorage.setItem('activeUser',data.user.email || data.user.phone); } catch {}
      message(data.message, 'success');
    } catch (error) { if (localStorage.getItem('token')) message(error.name === 'AbortError' ? 'Cavab alınmadı. Yenidən yükləyib məlumatları yoxlayın.' : error.message, 'error'); }
    finally { busy = false; save.disabled = false; fieldset.disabled = false; save.textContent = 'Yadda saxla'; }
  });
  login.addEventListener('click', () => document.getElementById('openLoginModal').click());
  retry.addEventListener('click', load);
  window.addEventListener('essen:login', load);
  window.addEventListener('essen:logout', signedOut);
  window.addEventListener('storage', event => { if (event.key === 'token' || event.key === null) load(); });
  load();
})();
