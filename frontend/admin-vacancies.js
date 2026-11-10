(() => {
  'use strict';
  const tabs = document.querySelector('.admin-tabs');
  if (!tabs) return;
  const element = (tag, text) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
  const tab = element('button', 'Vakansiyalar');
  tab.id = 'vacanciesTab'; tab.type = 'button'; tab.className = 'admin-tab'; tabs.append(tab);
  const view = element('section'); view.id = 'vacanciesView'; view.hidden = true; tabs.after(view);
  view.innerHTML = `
    <div class="panel-header vacancy-panel-header"><div><h2>Vakansiyalar</h2><p>Elanları əlavə edin, redaktə edin və saytda yayımlayın.</p></div><div class="vacancy-toolbar"><a class="btn-ghost" href="/vakansiyalar.html" target="_blank" rel="noopener">Saytda bax</a><button class="btn-accent" id="newVacancy" type="button">+ Vakansiya əlavə et</button></div></div>
    <div class="vacancy-filters"><label>Status<select id="vacancyFilter"><option value="current">Bütün elanlar (arxiv xaric)</option><option value="draft">Qaralamalar</option><option value="published">Yayımlananlar</option><option value="closed">Bağlı elanlar</option><option value="archived">Arxiv</option></select></label><button class="btn-ghost" type="button" id="reloadVacancies">Yenilə</button></div>
    <p id="vacancyStatus" role="status" aria-live="polite"></p><div id="vacancyList"></div>
    <dialog id="vacancyDialog" aria-labelledby="vacancyDialogTitle">
      <form id="vacancyForm"><div class="vacancy-dialog-header"><h2 id="vacancyDialogTitle">Vakansiya əlavə et</h2><button type="button" class="btn-ghost" id="closeVacancyDialog" aria-label="Bağla">×</button></div>
        <fieldset id="vacancyFields"><div class="vacancy-form-grid">
          <label class="full">Vəzifə adı *<input name="title" required maxlength="160" placeholder="Məsələn: Satış məsləhətçisi"></label>
          <label>Bölmə<input name="department" maxlength="120" placeholder="Məsələn: Mağaza"></label>
          <label>İş yeri<input name="location" maxlength="160" placeholder="Şəhər, filial və ya ünvan"></label>
          <label>İş qrafiki<input name="employmentType" maxlength="80" list="vacancySchedules" placeholder="Məsələn: Tam iş günü"><datalist id="vacancySchedules"><option value="Tam iş günü"><option value="Yarım iş günü"><option value="Növbəli iş"><option value="Təcrübə proqramı"></datalist></label>
          <label>Əməkhaqqı<input name="salary" maxlength="120" placeholder="Məbləğ və ya razılaşma ilə"></label>
          <label class="full">Vəzifə haqqında<textarea name="description" rows="4" maxlength="6000" placeholder="Görüləcək işləri və vəzifə öhdəliklərini yazın."></textarea></label>
          <label class="full">Tələblər<textarea name="requirements" rows="4" maxlength="4000" placeholder="Təcrübə, bacarıqlar və digər tələblər. Hər bəndi yeni sətirdə yaza bilərsiniz."></textarea></label>
          <label class="full">İş şəraiti<textarea name="benefits" rows="3" maxlength="4000" placeholder="İş saatları və təklif olunan şərtlər."></textarea></label>
          <label>Müraciət e-poçtu<input name="contactEmail" type="email" maxlength="254" placeholder="CV-lərin göndəriləcəyi e-poçt"></label>
          <label>Müraciət üçün WhatsApp<input name="contactPhone" type="tel" maxlength="40" placeholder="+994 10 123 45 67"></label>
          <p class="vacancy-form-help full">Müraciətlər yazdığınız e-poçta və ya WhatsApp nömrəsinə yönləndiriləcək. Yayımlamaq üçün ən azı biri doldurulmalıdır.</p>
          <label>Son müraciət tarixi<input name="deadline" type="date"><span>Boş qaldıqda vaxt məhdudiyyəti olmur.</span></label>
          <label>Göstərilmə sırası<input name="position" type="number" min="0" max="100000" step="1" required value="1000"><span>Kiçik rəqəm daha yuxarıda görünür.</span></label>
          <label class="full">Status<select name="status"><option value="draft">Qaralama — saytda görünmür</option><option value="published">Yayımlansın — saytda görünsün</option><option value="closed">Bağlı — müraciət qəbulu bitib</option><option value="archived">Arxiv — saytda görünmür</option></select></label>
          <label class="full">Əlavə qeyd<textarea name="additionalNote" rows="4" maxlength="4000" placeholder="Vakansiya ilə bağlı əlavə qeydlərinizi yazın."></textarea><span>İstəyə bağlıdır. Doldurulduqda elanın ən aşağısında görünür.</span></label>
        </div></fieldset>
        <p id="vacancyFormMessage" role="alert"></p><div class="vacancy-dialog-actions"><button type="button" class="btn-ghost" id="cancelVacancy">Ləğv et</button><button type="submit" class="btn-accent" id="saveVacancy">Yadda saxla</button></div>
      </form>
    </dialog>`;
  const list = view.querySelector('#vacancyList'), message = view.querySelector('#vacancyStatus');
  const filter = view.querySelector('#vacancyFilter'), dialog = view.querySelector('#vacancyDialog');
  const form = view.querySelector('#vacancyForm'), formMessage = view.querySelector('#vacancyFormMessage');
  const fields = ['title','department','location','employmentType','salary','description','requirements','benefits','contactEmail','contactPhone','additionalNote'];
  const labels = { draft:'Qaralama', published:'Yayımlanıb', closed:'Bağlı', archived:'Arxiv' };
  let rows = [], editing = null, busy = false, generation = 0;

  async function request(path = '', options = {}) {
    const token = getToken();
    const response = await fetch('/api/admin/vacancies' + path, {
      cache:'no-store', ...options,
      headers:{ Authorization:'Bearer ' + token, 'Content-Type':'application/json' }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 && token === getToken()) {
      document.getElementById('logoutBtn').click();
      const error = document.getElementById('loginError');
      error.textContent = 'Giriş sessiyanız bitib. Yenidən daxil olun.'; error.style.display = 'block';
    }
    if (!response.ok) throw Error(data.message || data.error || 'Əməliyyat alınmadı. Yenidən cəhd edin.');
    return data;
  }

  const expired = row => row.status === 'published' && row.deadline && new Date(row.deadline) < new Date();
  const statusText = row => expired(row) ? 'Müddəti bitib' : labels[row.status];
  function button(text, action) { const b = element('button', text); b.type='button'; b.className='btn-ghost'; b.addEventListener('click', action); return b; }
  function render() {
    list.replaceChildren();
    const visible = rows.filter(row => filter.value === 'current' ? row.status !== 'archived' : row.status === filter.value);
    if (!visible.length) { const empty=element('p', rows.length ? 'Bu statusda vakansiya yoxdur.' : 'Hələ vakansiya əlavə edilməyib. “Vakansiya əlavə et” düyməsi ilə ilk elanı yaradın.'); empty.className='vacancy-admin-empty'; list.append(empty); }
    for (const row of visible) {
      const card=element('article'); card.className='vacancy-admin-card';
      const info=element('div'), title=element('h3',row.title); info.append(title);
      const details=[row.department,row.location,row.employmentType].filter(Boolean);
      if (details.length) info.append(element('p',details.join(' · ')));
      if (row.deadline) info.append(element('small','Son müraciət: '+new Intl.DateTimeFormat('az-AZ',{timeZone:'Asia/Baku',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(row.deadline))));
      const badge=element('span',statusText(row)); badge.className='vacancy-status-label '+(expired(row)?'closed':row.status);
      const actions=element('div'); actions.className='vacancy-row-actions';
      actions.append(button('Redaktə et',()=>openForm(row)));
      if (row.status==='published') actions.append(button('Elanı bağla',()=>changeStatus(row,'closed')));
      if (row.status==='archived') actions.append(button('Qaralamaya qaytar',()=>changeStatus(row,'draft')));
      else actions.append(button('Arxivlə',()=>archive(row)));
      if(row.status==='published'&&!expired(row)) { const link=element('a','Saytda bax ↗'); link.href='/vakansiyalar.html#vakansiya-'+row.id; link.target='_blank'; link.rel='noopener'; link.className='btn-ghost'; actions.append(link); }
      card.append(info,badge,actions);list.append(card);
    }
    message.textContent = `${visible.length} elan`;
  }
  async function load() {
    const current=++generation;
    message.textContent='Yüklənir…';
    try { const loaded=await request(); if(current!==generation)return; rows=loaded;render(); }
    catch(error) { if(current!==generation)return; message.textContent=error.message; }
  }
  function openForm(row) {
    if(busy)return;
    editing=row?.id ?? null;form.reset();
    for(const field of fields)form.elements.namedItem(field).value=row?.[field]||'';
    form.elements.position.value=row?.position??1000;
    form.elements.status.value=row?.status||'draft';
    form.elements.deadline.value=row?.deadline?row.deadline.slice(0,10):'';
    formMessage.textContent='';
    view.querySelector('#vacancyDialogTitle').textContent=row?'Vakansiyanı redaktə et':'Vakansiya əlavə et';
    dialog.showModal();form.elements.title.focus();
  }
  function busyState(value) {
    busy=value;
    view.querySelector('#vacancyFields').disabled=value;
    for(const id of ['saveVacancy','cancelVacancy','closeVacancyDialog','newVacancy','reloadVacancies'])view.querySelector('#'+id).disabled=value;
    list.querySelectorAll('button').forEach(b=>b.disabled=value);
  }
  async function changeStatus(row,status,method='PATCH') {
    if(busy)return;
    busyState(true);message.textContent='Saxlanılır…';
    try { await request('/'+row.id,{method,...(method==='PATCH'?{body:JSON.stringify({status})}:{})}); await load(); }
    catch(error) { message.textContent=error.message; }
    finally {busyState(false);}
  }
  function archive(row) { if(!busy&&confirm('“'+row.title+'” arxivlənsin? Sonradan arxivdən bərpa edə bilərsiniz.'))changeStatus(row,'archived','DELETE'); }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy||!form.reportValidity())return;
    const data=Object.fromEntries(fields.map(field=>[field,form.elements.namedItem(field).value]));
    data.status=form.elements.status.value;data.position=Number(form.elements.position.value);data.deadline=form.elements.deadline.value;
    const session=getToken();busyState(true);formMessage.textContent='Saxlanılır…';
    try {
      await request(editing?'/'+editing:'',{method:editing?'PATCH':'POST',body:JSON.stringify(data)});
      if(session!==getToken())return;
      dialog.close();filter.value=data.status==='archived'?'archived':'current';await load();
      showToast(data.status==='published'?'Vakansiya saytda yayımlandı.':'Vakansiya saxlanıldı.');
    } catch(error) { formMessage.textContent=error.message; }
    finally {busyState(false);}
  });
  const closeForm=()=>{if(!busy)dialog.close();};
  view.querySelector('#newVacancy').addEventListener('click',()=>openForm());
  view.querySelector('#cancelVacancy').addEventListener('click',closeForm);
  view.querySelector('#closeVacancyDialog').addEventListener('click',closeForm);
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  view.querySelector('#reloadVacancies').addEventListener('click',load);
  filter.addEventListener('change',render);
  function openView() {
    for(const id of ['productView','chatView','homeSectionsView','creditOrdersView','qr-admin']){const other=document.getElementById(id);if(other)other.style.display='none';}
    for(const id of ['usersView','brandsView']){const other=document.getElementById(id);if(other)other.hidden=true;}
    tabs.querySelectorAll('.admin-tab').forEach(other=>other.classList.remove('active'));
    view.hidden=false;tab.classList.add('active');
    clearTimeout(chatRefreshTimer);adminChatStreamAbort?.abort();
    history.replaceState(null,'',location.pathname+location.search+'#vakansiyalar');load();
  }
  tab.addEventListener('click',openView);
  tabs.addEventListener('click',event=>{
    const selected=event.target.closest('.admin-tab');
    if(selected&&selected!==tab){view.hidden=true;tab.classList.remove('active');if(location.hash==='#vakansiyalar')history.replaceState(null,'',location.pathname+location.search);}
  });
  document.getElementById('logoutBtn').addEventListener('click',()=>{
    generation++;rows=[];list.replaceChildren();message.textContent='';editing=null;form.reset();dialog.close();view.hidden=true;tab.classList.remove('active');
    document.getElementById('productView').style.display='block';document.getElementById('productsTab').classList.add('active');
  });
  window.addEventListener('essen:admin-session',()=>{if(location.hash==='#vakansiyalar')openView();});
  if(getUser()?.role==='admin'&&getToken()&&location.hash==='#vakansiyalar')openView();
})();
