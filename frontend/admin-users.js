(() => {
  const tab=document.createElement('button'); tab.id='usersTab';tab.className='admin-tab';tab.textContent='İstifadəçilər';
  document.querySelector('.admin-tabs').append(tab);
  const view=document.createElement('section');view.id='usersView';view.hidden=true;
  view.innerHTML='<div class="users-heading"><div><h2>Qeydiyyatlı istifadəçilər</h2><p>Ümumi istifadəçi sayı: <strong id="usersTotal">—</strong></p></div><button id="usersReload" class="btn-ghost" type="button">Yenilə</button></div><form id="usersSearchForm" class="users-search"><label for="usersSearch">İstifadəçi axtar</label><div><input id="usersSearch" type="search" placeholder="ID kodu, ad, soyad, telefon və ya e-poçt" maxlength="150" autocomplete="off"><button class="btn-primary" type="submit">Axtar</button></div></form><p id="usersStatus" role="status" aria-live="polite"></p><div class="users-table-wrap"><table id="usersTable"><thead><tr><th>ID kodu</th><th>Ad, soyad</th><th>E-poçt</th><th>Telefon nömrəsi</th><th>Doğum tarixi</th><th>Qeydiyyat tarixi</th></tr></thead><tbody></tbody></table></div><div class="users-pagination"><button id="usersPrev" class="btn-ghost" type="button">Əvvəlki</button><span id="usersPage"></span><button id="usersNext" class="btn-ghost" type="button">Növbəti</button></div>';
  document.getElementById('productView').before(view);
  const $=id=>document.getElementById(id),body=view.querySelector('tbody');let page=1,pages=1,controller,timer;
  const date=value=>value ? new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Baku',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value)).replaceAll('/','.') : '—';
  function clear(){controller?.abort();body.replaceChildren();$('usersTotal').textContent='—';$('usersStatus').textContent='';$('usersPage').textContent='';$('usersPrev').disabled=$('usersNext').disabled=true;}
  async function load(){
    controller?.abort();const current=controller=new AbortController(),token=getToken();
    const timeout=setTimeout(()=>current.abort(),20000);body.replaceChildren();$('usersStatus').textContent='İstifadəçilər yüklənir…';$('usersPrev').disabled=$('usersNext').disabled=true;
    try{
      const response=await fetch('/api/admin/users?'+new URLSearchParams({q:$('usersSearch').value.trim(),page:String(page)}),{cache:'no-store',headers:authHeaders(),signal:current.signal});
      const data=await response.json();if(current!==controller || token!==getToken())return;
      if(!response.ok)throw new Error(data.message || 'İstifadəçilər yüklənmədi.');
      $('usersTotal').textContent=data.total.toLocaleString('az-AZ');pages=Math.max(1,Math.ceil(data.filtered/data.limit));
      $('usersStatus').textContent=data.filtered ? `${data.filtered} istifadəçi${$('usersSearch').value.trim() ? ' tapıldı' : ''}` : 'Uyğun istifadəçi tapılmadı.';
      for(const user of data.users){const row=document.createElement('tr');for(const value of [user.userCode,user.fullName || '—',user.email || '—',user.phone || '—',date(user.birthDate),date(user.createdAt)]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}body.append(row);}
      $('usersPage').textContent=`Səhifə ${data.page} / ${pages}`;$('usersPrev').disabled=page<=1;$('usersNext').disabled=page>=pages;
    }catch(error){if(current!==controller || token!==getToken())return;body.replaceChildren();$('usersTotal').textContent='—';$('usersPage').textContent='';$('usersStatus').textContent=error.name==='AbortError'?'Sorğu vaxtı bitdi. Yeniləyib təkrar cəhd edin.':error.message;}
    finally{clearTimeout(timeout);}
  }
  const others=[['productsTab','productView'],['homeSectionsTab','homeSectionsView'],['chatsTab','chatView']];
  tab.addEventListener('click',()=>{for(const [id,target] of others){$(id).classList.remove('active');$(target).style.display='none';}tab.classList.add('active');view.hidden=false;clearTimeout(chatRefreshTimer);adminChatStreamAbort?.abort();page=1;load();});
  for(const [id] of others)$(id).addEventListener('click',()=>{tab.classList.remove('active');view.hidden=true;controller?.abort();clearTimeout(timer);});
  $('usersSearchForm').addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);page=1;load();});
  $('usersSearch').addEventListener('input',()=>{clearTimeout(timer);controller?.abort();timer=setTimeout(()=>{page=1;load();},300);});
  $('usersReload').addEventListener('click',()=>{page=1;load();});
  $('usersPrev').addEventListener('click',()=>{if(page>1){page--;load();}});$('usersNext').addEventListener('click',()=>{if(page<pages){page++;load();}});
  $('logoutBtn').addEventListener('click',()=>{clearTimeout(timer);clear();});
  window.addEventListener('essen:admin-session',()=>{clear();if(!view.hidden)load();});
  window.addEventListener('storage',event=>{if(event.key==='token' || event.key===null){clear();if(!view.hidden && getToken())load();}});
  setInterval(()=>{if(!view.hidden && !document.hidden && getToken())load();},60000);
})();
