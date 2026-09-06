/* Shared phone authentication UI; countdowns are based on server responses. */
window.EssenPhoneAuth = {
  mount({ openLoginModal, loginModal, loginMessage, closeLoginModal }) {
    const $ = id => document.getElementById(id);
    const boxes = [...document.querySelectorAll('.otp-box')];
    const storageKey = 'essen:otp-phone';
    let phone = '', registrationToken = '', busy = false, generation = 0;
    let deadline = 0, timer = null, currentStep = 'phone';
    const readPhone = () => { try { return sessionStorage.getItem(storageKey) || ''; } catch { return ''; } };
    const savePhone = () => { try { phone ? sessionStorage.setItem(storageKey, phone) : sessionStorage.removeItem(storageKey); } catch {} };
    async function request(path, body, method = 'POST') {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      try {
        const response = await fetch('/login-code' + path, { method, cache: 'no-store', signal: controller.signal,
          ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = new Error(data.message || 'Xidmət müvəqqəti əlçatan deyil. Yenidən cəhd edin.');
          error.retryAfter = data.resendAfterSeconds ?? data.retryAfter;
          throw error;
        }
        return data;
      } catch (error) {
        if (error.name === 'AbortError') throw new Error('Sorğu vaxtı bitdi. Yenidən cəhd edin.');
        if (error instanceof TypeError) throw new Error('Serverlə əlaqə qurulmadı. Yenidən cəhd edin.');
        throw error;
      } finally { clearTimeout(timeout); }
    }
    function tick() {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      $('otpTimer').textContent = '';
      $('otpResend').textContent = 'Kodu yenidən göndər' + (left ? ` — ${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}` : '');
      $('otpResend').disabled = busy || left > 0 || !phone;
    }
    function setCountdown(seconds) {
      deadline = Date.now() + Math.max(0, Number(seconds) || 0) * 1000;
      clearInterval(timer); tick(); timer = setInterval(tick, 250);
    }
    function show(step) {
      currentStep = step;
      document.querySelectorAll('[data-auth-step]').forEach(section => section.classList.toggle('active', section.dataset.authStep === step));
      loginMessage.textContent = '';
    }
    function reset() {
      generation++; phone = ''; registrationToken = ''; savePhone();
      clearInterval(timer); deadline = 0; boxes.forEach(input => input.value = '');
      $('emailDesignForm').reset(); show('phone'); tick();
    }
    function setBusy(value, button, label) {
      busy = value;
      document.querySelectorAll('#loginModal button').forEach(item => { if (item !== closeLoginModal) item.disabled = value; });
      if (button) button.textContent = label;
      tick();
    }
    async function run(button, label, action) {
      if (busy) return;
      const original = button.textContent;
      const version = ++generation;
      setBusy(true, button, label); loginMessage.textContent = '';
      try { await action(version); }
      catch (error) {
        if (version !== generation) return;
        if (Number.isFinite(error.retryAfter)) setCountdown(error.retryAfter);
        loginMessage.textContent = error.message;
      } finally { setBusy(false, button, original); }
    }
    async function sync() {
      if (!phone || busy || currentStep === 'email') return;
      const version = generation;
      try {
        const data = await request('/otp/status?phone=' + encodeURIComponent(phone), null, 'GET');
        if (version !== generation) return;
        setCountdown(data.resendAfterSeconds);
        if (data.codeSent) { show('otp'); $('otpPhonePreview').textContent = phone; }
        else show('phone');
      } catch (error) { if (version === generation) loginMessage.textContent = error.message; }
    }
    function openModal() {
      loginModal.classList.remove('hidden'); loginModal.classList.add('flex');
      if (!phone) { phone = readPhone(); if (phone) $('authPhone').value = phone; }
      show(registrationToken ? 'email' : 'phone');
      $('otpPhonePreview').textContent = phone;
      tick(); sync();
    }
    function closeModal() {
      loginModal.classList.add('hidden'); loginModal.classList.remove('flex');
      clearInterval(timer); loginMessage.textContent = '';
    }
    function complete(data) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('activeUser', data.user.email || data.user.phone);
      localStorage.setItem('user', JSON.stringify(data.user));
      openLoginModal.textContent = data.user.name || data.user.phone;
      openLoginModal.classList.add('logged-in');
      reset(); closeModal();
      window.dispatchEvent(new CustomEvent('essen:login', { detail: data.user }));
    }
    closeLoginModal.addEventListener('click', closeModal);
    loginModal.addEventListener('click', event => { if (event.target === loginModal) closeModal(); });
    $('authPhone').addEventListener('input', event => {
      let digits = event.target.value.replace(/\D/g, '');
      if (digits.startsWith('994')) digits = digits.slice(3);
      else if (digits.startsWith('0')) digits = digits.slice(1);
      event.target.value = '+994' + digits.slice(0, 9);
    });
    $('phoneDesignForm').addEventListener('submit', event => {
      event.preventDefault();
      const entered = $('authPhone').value;
      if (!/^\+994\d{9}$/.test(entered.replace(/[\s()-]/g, ''))) { loginMessage.textContent = 'Telefon nömrəsini tam daxil edin.'; return; }
      run(event.submitter || event.target.querySelector('[type=submit]'), 'Kod göndərilir...', async version => {
        phone = entered; savePhone();
        const data = await request('/otp/request', { phone });
        if (version !== generation) return;
        registrationToken = ''; boxes.forEach(input => input.value = '');
        $('otpPhonePreview').textContent = phone; show('otp'); setCountdown(data.resendAfterSeconds); boxes[0].focus();
      });
    });
    boxes.forEach((input, index) => {
      input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, '').slice(-1); if (input.value && boxes[index + 1]) boxes[index + 1].focus(); });
      input.addEventListener('keydown', event => { if (event.key === 'Backspace' && !input.value && boxes[index - 1]) boxes[index - 1].focus(); });
      input.addEventListener('paste', event => {
        const digits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!digits) return; event.preventDefault(); boxes.forEach((box, i) => box.value = digits[i] || ''); boxes[Math.min(digits.length, 6) - 1].focus();
      });
    });
    $('otpDesignForm').addEventListener('submit', event => {
      event.preventDefault(); const code = boxes.map(input => input.value).join('');
      if (!/^\d{6}$/.test(code)) { loginMessage.textContent = '6 rəqəmli kodu tam daxil edin.'; return; }
      run(event.submitter || event.target.querySelector('[type=submit]'), 'Kod yoxlanılır...', async version => {
        const data = await request('/verify-code', { phone, code });
        if (version !== generation) return;
        if (!data.registrationRequired) return complete(data);
        registrationToken = data.registrationToken; boxes.forEach(input => input.value = ''); show('email'); $('authFirstName').focus();
      });
    });
    $('emailDesignForm').addEventListener('submit', event => {
      event.preventDefault();
      run(event.submitter || event.target.querySelector('[type=submit]'), 'Hesab yaradılır...', async version => {
        const data = await request('/complete-registration', { firstName: $('authFirstName').value, lastName: $('authLastName').value, birthDate: $('authBirthDate').value, email: $('authEmail').value, registrationToken });
        if (version === generation) complete(data);
      });
    });
    $('otpResend').addEventListener('click', event => {
      if (deadline > Date.now()) return;
      run(event.target, 'Kod göndərilir...', async version => {
        const data = await request('/otp/request', { phone });
        if (version !== generation) return;
        registrationToken = ''; boxes.forEach(input => input.value = ''); setCountdown(data.resendAfterSeconds); boxes[0].focus();
      });
    });
    document.querySelectorAll('[data-auth-back]').forEach(button => button.addEventListener('click', () => { if (!busy) reset(); }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !loginModal.classList.contains('hidden')) sync(); });
    window.addEventListener('focus', () => { if (!loginModal.classList.contains('hidden')) sync(); });
    return { openModal, closeModal };
  }
};
