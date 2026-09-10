let chatOpen = false;
let operatorChatOpen = false;
let guestSessionPromise = null;
let guestSessionId = null;
let chatPollTimer = null;
let chatLoading = false;
let chatSending = false;
let guestHistoryReady=false;
let latestOperatorMessage=0;
let guestUnread=0;
function clearGuestUnread() {
  if (!chatOpen || !operatorChatOpen || document.hidden) return;
  guestUnread=0;window.chatNotice.badge(document.getElementById('fab-btn'),0);
  window.chatNotice.badge(document.getElementById('operator-chat-choice'),0);
}
document.addEventListener('visibilitychange',clearGuestUnread);
const renderedChatMessageIds = new Set();
const chatStatus = text => { document.getElementById('status-text').textContent = text; };

// Keep the mobile composer inside the visible area when the keyboard opens.
function updateChatViewport() {
  const viewport=window.visualViewport;
  const panel=document.getElementById('chat-window');
  panel.style.setProperty('--chat-viewport-height',`${viewport ? viewport.height : window.innerHeight}px`);
  panel.style.setProperty('--chat-viewport-top',`${viewport ? viewport.offsetTop : 0}px`);
}
window.visualViewport?.addEventListener('resize',updateChatViewport);
window.visualViewport?.addEventListener('scroll',updateChatViewport);
window.addEventListener('resize',updateChatViewport);
updateChatViewport();

let chatIdentity = localStorage.getItem('token') || '';
let chatGeneration = 0;
function syncChatIdentity() {
  const current = localStorage.getItem('token') || '';
  if (current === chatIdentity) return;
  chatIdentity = current; chatGeneration++;
  guestSessionPromise = null; guestSessionId = null;
  guestHistoryReady = false; latestOperatorMessage = 0; guestUnread = 0;
  renderedChatMessageIds.clear(); document.getElementById('chat-body').replaceChildren();
  document.getElementById('chat-input').value = '';
  window.chatNotice.badge(document.getElementById('fab-btn'),0);
  window.chatNotice.badge(document.getElementById('operator-chat-choice'),0);
}
window.addEventListener('essen:login', syncChatIdentity);
window.addEventListener('essen:logout', syncChatIdentity);
window.addEventListener('storage', event => { if (event.key === 'token' || event.key === null) syncChatIdentity(); });

async function ensureGuestSession() {
  syncChatIdentity();
  if (!guestSessionPromise) {
    const identity = chatIdentity, generation = chatGeneration;
    guestSessionPromise = (async () => {
      const response = await fetch(identity ? '/api/chats/session' : '/api/chats/guest/session', {method:'POST',credentials:'same-origin',headers:identity ? {Authorization:'Bearer '+identity} : {}});
      if (!response.ok) throw new Error(response.status === 401 ? 'Çat üçün hesabınıza yenidən daxil olun.' : 'Çat açıla bilmədi. Yenidən cəhd edin.');
      const session = await response.json();
      if (generation !== chatGeneration || identity !== (localStorage.getItem('token') || '')) throw new Error('Hesab dəyişdi. Çatı yenidən açın.');
      clearInterval(chatPollTimer); chatPollTimer=setInterval(loadGuestMessages,3000);
      if (guestSessionId !== session.id) {
        guestSessionId=session.id; renderedChatMessageIds.clear(); document.getElementById('chat-body').replaceChildren();
      }
      return session;
    })().catch(error => { if (generation === chatGeneration) guestSessionPromise=null; throw error; });
  }
  return guestSessionPromise;
}

async function guestRequest(options = {}) {
  syncChatIdentity();
  const identity=chatIdentity, generation=chatGeneration;
  let session=await ensureGuestSession();
  if (generation !== chatGeneration) throw new Error('Hesab dəyişdi. Çatı yenidən açın.');
  const send = () => fetch(identity ? '/api/chats/'+session.id+'/messages' : '/api/chats/guest/messages', {...options,credentials:'same-origin',headers:{...options.headers,...(identity ? {Authorization:'Bearer '+identity} : {})}});
  let response=await send();
  if (response.status === 401 && !identity && generation === chatGeneration) {
    guestSessionPromise=null;
    if (options.method !== 'POST') { guestHistoryReady=false;latestOperatorMessage=0;guestUnread=0;return []; }
    session=await ensureGuestSession();response=await send();
  }
  if (!response.ok) { const error=await response.json().catch(()=>({}));throw new Error(error.message || 'Bağlantı alınmadı. Yenidən cəhd edin.'); }
  const data=await response.json();
  if (generation !== chatGeneration || identity !== (localStorage.getItem('token') || '')) throw new Error('Hesab dəyişdi. Çatı yenidən açın.');
  return data;
}

function renderChatMessage(message) {
  if (!message?.id || renderedChatMessageIds.has(message.id)) return;
  renderedChatMessageIds.add(message.id);
  const body=document.getElementById('chat-body');
  const row=document.createElement('div');
  row.dataset.messageId=String(message.id);
  row.className='msg '+(message.sender === 'user' ? 'user' : 'op');
  const content=document.createElement('div');
  const label=document.createElement('div'); label.className='msg-time';
  label.textContent=message.sender === 'user' ? 'Siz' : 'Operator';
  const bubble=document.createElement('div'); bubble.className='msg-bubble'; bubble.textContent=message.text;
  const time=document.createElement('div'); time.className='msg-time';
  time.textContent=new Date(message.createdAt).toLocaleTimeString('az-AZ',{hour:'2-digit',minute:'2-digit'});
  content.append(label,bubble,time); row.append(content); body.append(row);
  body.scrollTop=body.scrollHeight;
}

async function loadGuestMessages() {
  if ((!guestSessionPromise && !operatorChatOpen) || chatLoading) return;
  chatLoading=true;
  try {
    const messages=await guestRequest();
    const incoming=messages.filter(message=>message.sender === 'admin' && message.id > latestOperatorMessage);
    if (guestHistoryReady && incoming.length) {
      window.chatNotice.sound();
      if (!chatOpen || !operatorChatOpen || document.hidden) guestUnread+=incoming.length;
    }
    latestOperatorMessage=Math.max(latestOperatorMessage,...incoming.map(message=>message.id));
    guestHistoryReady=true;
    clearGuestUnread();
    window.chatNotice.badge(document.getElementById('fab-btn'),guestUnread);
    window.chatNotice.badge(document.getElementById('operator-chat-choice'),guestUnread);
    const currentIds=new Set(messages.map(message=>message.id));
    document.querySelectorAll('#chat-body [data-message-id]').forEach(row=>{
      const id=Number(row.dataset.messageId);
      if (!currentIds.has(id)) { row.remove(); renderedChatMessageIds.delete(id); }
    });
    messages.forEach(renderChatMessage);
    if (operatorChatOpen) chatStatus('Operatorla sayt üzərindən yazışma');
  } catch (error) { chatStatus(error.message); }
  finally { chatLoading=false; }
}

function showChatChoices() {
  operatorChatOpen=false;
  document.getElementById('chat-choices').hidden=false;
  document.getElementById('chat-body').hidden=true;
  document.getElementById('chat-footer').hidden=true;
  document.getElementById('chat-back').hidden=true;
  chatStatus('Əlaqə üsulunu seçin');
}

function startOperatorChat() {
  operatorChatOpen=true;
  clearGuestUnread();
  document.getElementById('chat-choices').hidden=true;
  document.getElementById('chat-body').hidden=false;
  document.getElementById('chat-footer').hidden=false;
  document.getElementById('chat-back').hidden=false;
  chatStatus('Çat açılır...');
  loadGuestMessages();
  clearInterval(chatPollTimer);
  // Polling also delivers messages across server restarts and multiple workers.
  chatPollTimer=setInterval(loadGuestMessages,3000);
  document.getElementById('chat-input').focus();
}

function toggleChat() {
  updateChatViewport();
  chatOpen=!chatOpen;
  document.getElementById('chat-window').classList.toggle('open',chatOpen);
  document.getElementById('fab-btn').setAttribute('aria-expanded',String(chatOpen));
  if (chatOpen) showChatChoices();
}

async function sendMessage() {
  const input=document.getElementById('chat-input');
  const text=input.value.trim();
  if (!text || chatSending) return;
  chatSending=true;
  const button=document.getElementById('chat-send'); button.disabled=true;
  try {
    await guestRequest({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
    if (input.value.trim() === text) input.value='';
    await loadGuestMessages();
  } catch (error) { chatStatus(error.message); }
  finally { chatSending=false; button.disabled=false; }
}

document.getElementById('close-btn').onclick=()=>{ if (chatOpen) toggleChat(); };
document.getElementById('chat-back').onclick=showChatChoices;
document.getElementById('operator-chat-choice').onclick=startOperatorChat;
document.getElementById('chat-input').addEventListener('keydown',event=>{
  if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); sendMessage(); }
});
