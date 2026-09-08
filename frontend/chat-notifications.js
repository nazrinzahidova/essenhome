// Browsers enable audio after the first click or key press on the page.
window.chatNotice = (() => {
  let context;
  function unlock() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      context ||= new Audio();
      if (context.state === 'suspended') context.resume().catch(()=>{});
    } catch {}
  }
  document.addEventListener('pointerdown',unlock);
  document.addEventListener('keydown',unlock);
  return {
    sound() {
      if (!context || context.state !== 'running') return;
      const oscillator=context.createOscillator(), gain=context.createGain();
      oscillator.connect(gain); gain.connect(context.destination);
      const now=context.currentTime;
      oscillator.frequency.setValueAtTime(740,now);
      oscillator.frequency.setValueAtTime(980,now+.12);
      gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(.12,now+.02);
      gain.gain.exponentialRampToValueAtTime(.001,now+.32);
      oscillator.start(now); oscillator.stop(now+.33);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    },
    badge(button,count) {
      let badge=button.querySelector('.chat-unread-badge');
      if (!badge) {
        badge=document.createElement('span');badge.className='chat-unread-badge';
        badge.setAttribute('role','status');button.append(badge);
      }
      badge.hidden=!count;
      badge.textContent=count > 99 ? '99+' : String(count);
      badge.setAttribute('aria-label',`${count} oxunmamış bildiriş`);
    }
  };
})();
