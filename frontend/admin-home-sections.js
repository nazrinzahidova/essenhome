async function homeRequest(path = '/admin', method = 'GET', body) {
  const token = getToken();
  const response = await fetch(`/api/home-sections${path}`, {
    method, cache: 'no-store', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  if (response.status === 401) {
    const message = 'Giriş sessiyanız etibarlı deyil. Yenidən daxil olun.';
    if (token === getToken()) {
      document.getElementById('logoutBtn').click();
      const loginError = document.getElementById('loginError');
      loginError.textContent = message;
      loginError.style.display = 'block';
    }
    throw new Error(message);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Əməliyyat alınmadı. Yenidən cəhd edin.');
  return data;
}
const homeTab = document.getElementById('homeSectionsTab');
const homeView = document.getElementById('homeSectionsView');
homeTab.addEventListener('click', () => {
  productsTab.classList.remove('active'); chatsTab.classList.remove('active'); homeTab.classList.add('active');
  document.getElementById('productView').style.display = 'none';
  document.getElementById('chatView').style.display = 'none'; homeView.style.display = 'block';
  clearTimeout(chatRefreshTimer); adminChatStreamAbort?.abort(); loadHomeSectionAdmin();
});
[productsTab, chatsTab].forEach(tab => tab.addEventListener('click', () => {
  homeTab.classList.remove('active'); homeView.style.display = 'none';
}));
document.getElementById('reloadHomeSections').addEventListener('click', loadHomeSectionAdmin);
document.getElementById('newHomeSection').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button'); button.disabled = true;
  try {
    await homeRequest('', 'POST', { name: document.getElementById('homeSectionName').value });
    document.getElementById('homeSectionName').value = ''; await loadHomeSectionAdmin();
  } catch (error) { showToast(error.message); } finally { button.disabled = false; }
});
async function loadHomeSectionAdmin() {
  const list = document.getElementById('homeSectionList');
  list.textContent = 'Yüklənir...';
  try {
    const sections = await homeRequest(); list.replaceChildren();
    if (!sections.length) list.textContent = 'Hələ bölmə yoxdur. İlk bölməni yaradın.';
    sections.forEach((section, index) => {
      const row = document.createElement('div'); row.className = 'home-section-edit';
      row.innerHTML = `<input type="text" maxlength="120" aria-label="Bölmə adı"><span>${section._count.products} məhsul</span><label><input type="checkbox"> Aktiv</label><button class="btn-ghost" data-action="save">Adı və statusu saxla</button><button class="btn-ghost" data-action="up" aria-label="Yuxarı">↑</button><button class="btn-ghost" data-action="down" aria-label="Aşağı">↓</button><button class="btn-danger-outline" data-action="delete">Bölməni sil</button>`;
      row.querySelector('input[type=text]').value = section.name;
      row.querySelector('input[type=checkbox]').checked = section.active;
      row.querySelector('[data-action=up]').disabled = index === 0;
      row.querySelector('[data-action=down]').disabled = index === sections.length - 1;
      row.addEventListener('click', async event => {
        const button = event.target.closest('button'); if (!button) return;
        const action = button.dataset.action;
        if (action === 'delete' && !confirm(`“${section.name}” bölməsi silinsin? Məhsullar silinməyəcək.`)) return;
        row.querySelectorAll('button').forEach(b => b.disabled = true);
        try {
          if (action === 'save') await homeRequest(`/${section.id}`, 'PATCH', {
            name: row.querySelector('input[type=text]').value, active: row.querySelector('input[type=checkbox]').checked
          });
          else if (action === 'delete') await homeRequest(`/${section.id}`, 'DELETE');
          else {
            const ids = sections.map(s => s.id), other = index + (action === 'up' ? -1 : 1);
            [ids[index], ids[other]] = [ids[other], ids[index]];
            await homeRequest('/order', 'PUT', { ids });
          }
          await loadHomeSectionAdmin();
        } catch (error) { showToast(error.message); await loadHomeSectionAdmin(); }
      });
      const orderButton=document.createElement('button');orderButton.type='button';orderButton.className='btn-ghost';orderButton.textContent='Bölmənin məhsulları';orderButton.onclick=event=>{event.stopPropagation();openProductOrder(section.id,section.name);};row.append(orderButton);
      list.append(row);
    });
  } catch (error) { list.textContent = error.message; }
}
async function openHomeMembership(productId) {
  const dialog = document.getElementById('homeMembershipDialog');
  const options = document.getElementById('homeMembershipOptions');
  document.getElementById('homeMembershipTitle').textContent = allProducts.find(p => p.id === productId)?.name || 'Ana səhifə bölmələri';
  options.textContent = 'Yüklənir...'; dialog.showModal();
  try {
    const [sections, selected] = await Promise.all([homeRequest(), homeRequest(`/products/${productId}`)]);
    options.replaceChildren();
    if (!sections.length) options.textContent = 'Əvvəl “Ana səhifə bölmələri” hissəsində bölmə yaradın.';
    sections.forEach(section => {
      const label = document.createElement('label'); label.style.cssText = 'display:flex;gap:12px;padding:12px 0';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = selected.includes(section.id);
      label.append(checkbox, document.createTextNode(section.name + (section.active ? '' : ' (deaktiv)'))); options.append(label);
      checkbox.addEventListener('change', async () => {
        const next = checkbox.checked; checkbox.disabled = true;
        try { await homeRequest(`/products/${productId}/${section.id}`, 'PUT', { selected: next }); showToast('Saxlanıldı'); }
        catch (error) { checkbox.checked = !next; showToast(error.message); }
        finally { checkbox.disabled = false; }
      });
    });
  } catch (error) { options.textContent = error.message; }
}


// Timed offer catalogue uses the existing product membership and order system.
(()=>{
 const tabs=document.querySelector('.admin-tabs'),tab=document.createElement('button');tab.className='admin-tab';tab.id='timedOffersTab';tab.textContent='Taymer kataloqu';tabs.append(tab);
 const view=document.createElement('section');view.id='timedOffersView';view.style.display='none';
 view.innerHTML=`<div class="panel-header"><h2>Taymer kataloqu</h2><button type="button" id="timedReload" class="btn-ghost">Yenilə</button></div><p>Slayderlə brendlər arasında görünür. Məhsulları “Məhsullar” siyahısında yanındakı taymer düyməsi ilə əlavə edib çıxara bilərsiniz.</p><form id="timedForm" style="display:flex;gap:16px;align-items:end;flex-wrap:wrap;margin:24px 0"><label>Kampaniyanın adı<input id="timedName" required maxlength="120" style="display:block;padding:10px;border:1px solid #ddd;border-radius:8px"></label><label>Bitmə vaxtı (Bakı vaxtı)<input id="timedEnd" type="datetime-local" required step="60" style="display:block;padding:10px;border:1px solid #ddd;border-radius:8px"></label><label><input type="checkbox" id="timedActive"> Aktiv</label><button class="btn-accent">Yadda saxla</button></form><p id="timedMessage" role="status"></p><div style="display:flex;gap:12px;margin:20px 0;flex-wrap:wrap"><button type="button" id="timedAddProducts" class="btn-accent">+ Məhsul seç</button><button type="button" id="timedOrder" class="btn-ghost">Məhsulların sırası</button><a href="/catalog.html?timed=1" target="_blank" rel="noopener" class="btn-ghost">Kampaniya kataloqunu aç ↗</a></div><div id="timedProducts"></div>`;
 tabs.after(view);let config=null,selected=new Set(),loading=null;
 const $=id=>document.getElementById(id);
 function message(value){$('timedMessage').textContent=value;}
 function stamp(date){const parts=Object.fromEntries(new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Baku',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(date)).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;}
 async function load(){if(loading)return loading;loading=(async()=>{config=await homeRequest('/timed/admin');selected=new Set(config.products.map(p=>p.id));paint();return config;})();try{return await loading;}finally{loading=null;}}
 function paint(){if(!config)return;$('timedName').value=config.name;$('timedEnd').value=stamp(config.endsAt);$('timedActive').checked=config.active;const list=$('timedProducts');list.replaceChildren();
  if(!config.products.length)list.textContent='Hələ məhsul əlavə edilməyib. “Məhsul seç” düyməsi ilə başlayın.';
  config.products.forEach(p=>{const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid #eee';const name=document.createElement('span');name.textContent=p.name+' · '+Number(p.price).toFixed(2)+' ₼';name.style.flex='1';const remove=document.createElement('button');remove.type='button';remove.className='btn-ghost';remove.textContent='Kataloqdan çıxar';remove.onclick=()=>toggle(p.id,remove);row.append(name,remove);list.append(row);});buttons();}
 function buttons(){document.querySelectorAll('#prodTbody tr[data-id]').forEach(row=>{let b=row.querySelector('[data-timed-product]');if(!b){b=document.createElement('button');b.type='button';b.className='btn-ghost';b.dataset.timedProduct=row.dataset.id;b.style.cssText='font-size:11px;white-space:nowrap;padding:7px';b.onclick=()=>toggle(Number(row.dataset.id),b);row.querySelector('.row-actions')?.prepend(b);}const included=selected.has(Number(row.dataset.id));b.textContent=included?'◷ Taymerdən çıxar':'◷ Taymer kataloquna əlavə et';b.setAttribute('aria-pressed',String(included));b.disabled=!config;});}
 async function toggle(id,b){b.disabled=true;try{await load();b.disabled=true;await homeRequest(`/products/${id}/${config.sectionId}`,'PUT',{selected:!selected.has(id)});await load();showToast('Taymer kataloqu saxlanıldı');}catch(e){showToast(e.message);message(e.message);}finally{b.disabled=false;}}
 tab.addEventListener('click',async()=>{productsTab.click();$('productView').style.display='none';productsTab.classList.remove('active');tab.classList.add('active');view.style.display='block';message('Yüklənir…');try{await load();message('Məhsullar ana səhifədə növbə ilə sürüşür, hamısı kampaniya kataloqunda görünür.');}catch(e){message(e.message);}});
 tabs.addEventListener('click',event=>{if(event.target.closest('.admin-tab')!==tab){view.style.display='none';tab.classList.remove('active');}});
 $('timedAddProducts').onclick=()=>productsTab.click();$('timedReload').onclick=()=>load().catch(e=>message(e.message));$('timedOrder').onclick=()=>config&&openProductOrder(config.sectionId,config.name);
 $('timedForm').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{config=await homeRequest('/timed','PATCH',{name:$('timedName').value,endsAt:$('timedEnd').value+':00+04:00',active:$('timedActive').checked});paint();message('Saxlanıldı. Bitmə vaxtı Bakı saatı ilə göstərilir.');}catch(error){message(error.message);}finally{button.disabled=false;}};
 new MutationObserver(()=>buttons()).observe($('prodTbody'),{childList:true});
 window.addEventListener('essen:admin-session',()=>{config=null;selected.clear();load().catch(()=>{});});
 if(getToken())load().catch(()=>{});
})();

