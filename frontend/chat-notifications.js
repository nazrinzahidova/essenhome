// Browsers enable audio after the first click or key press on the page.
window.chatNotice = (() => {
  let context;
  async function unlock() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return false;
      context ||= new Audio();
      if (context.state !== 'running') await context.resume();
      return context.state === 'running';
    } catch { return false; }
  }
  document.addEventListener('pointerdown',unlock);
  document.addEventListener('keydown',unlock);
  document.addEventListener('click',unlock);
  return {
    async sound() {
      if (!await unlock()) return false;
      const oscillator=context.createOscillator(), gain=context.createGain();
      oscillator.connect(gain); gain.connect(context.destination);
      const now=context.currentTime;
      oscillator.frequency.setValueAtTime(740,now);
      oscillator.frequency.setValueAtTime(980,now+.12);
      gain.gain.setValueAtTime(0,now);
      gain.gain.linearRampToValueAtTime(.25,now+.02);
      gain.gain.exponentialRampToValueAtTime(.001,now+.6);
      oscillator.start(now); oscillator.stop(now+.61);
      oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      return true;
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
