let chatOpen = false;
let operatorChatOpen = false;
let guestSessionPromise = null;
let guestSessionId = null;
let chatPollTimer = null;
let chatLoading = false;
let chatSending = false;
const renderedChatMessageIds = new Set();
const chatStatus = text => { document.getElementById('status-text').textContent = text; };

async function ensureGuestSession() {
  if (!guestSessionPromise) {
    guestSessionPromise = (async () => {
      const response = await fetch('/api/chats/guest/session', {method:'POST',credentials:'same-origin'});
      if (!response.ok) throw new Error('Çat açıla bilmədi. Yenidən cəhd edin.');
      const session = await response.json();
      if (guestSessionId !== session.id) {
        guestSessionId = session.id;
        renderedChatMessageIds.clear();
        document.getElementById('chat-body').replaceChildren();
      }
      return session;
    })().catch(error => { guestSessionPromise=null; throw error; });
  }
  return guestSessionPromise;
}

async function guestRequest(options = {}) {
  await ensureGuestSession();
  let response = await fetch('/api/chats/guest/messages', {...options,credentials:'same-origin'});
  if (response.status === 401) {
    guestSessionPromise=null;
    await ensureGuestSession();
    response=await fetch('/api/chats/guest/messages', {...options,credentials:'same-origin'});
  }
  if (!response.ok) {
    const error=await response.json().catch(()=>({}));
    throw new Error(error.message || 'Bağlantı alınmadı. Yenidən cəhd edin.');
  }
  return response.json();
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
  if (!chatOpen || !operatorChatOpen || chatLoading) return;
  chatLoading=true;
  try {
    const messages=await guestRequest();
    const currentIds=new Set(messages.map(message=>message.id));
    document.querySelectorAll('#chat-body [data-message-id]').forEach(row=>{
      const id=Number(row.dataset.messageId);
      if (!currentIds.has(id)) { row.remove(); renderedChatMessageIds.delete(id); }
    });
    messages.forEach(renderChatMessage);
    chatStatus('Operatorla sayt üzərindən yazışma');
  } catch (error) { chatStatus(error.message); }
  finally { chatLoading=false; }
}

function showChatChoices() {
  operatorChatOpen=false;
  clearInterval(chatPollTimer);
  document.getElementById('chat-choices').hidden=false;
  document.getElementById('chat-body').hidden=true;
  document.getElementById('chat-footer').hidden=true;
  document.getElementById('chat-back').hidden=true;
  chatStatus('Əlaqə üsulunu seçin');
}

function startOperatorChat() {
  operatorChatOpen=true;
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
  chatOpen=!chatOpen;
  document.getElementById('chat-window').classList.toggle('open',chatOpen);
  document.getElementById('fab-btn').setAttribute('aria-expanded',String(chatOpen));
  if (chatOpen) showChatChoices();
  else clearInterval(chatPollTimer);
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
