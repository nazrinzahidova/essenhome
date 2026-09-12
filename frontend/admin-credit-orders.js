(() => {
  const tab=document.getElementById('creditOrdersTab'), view=document.getElementById('creditOrdersView');
  const list=document.getElementById('creditOrderList'), pageInfo=document.getElementById('creditPageInfo');let page=1;
  const statuses={new:'Yeni',contacted:'Əlaqə saxlanılıb',completed:'Tamamlanıb',cancelled:'Ləğv edilib'};
  const money=n=>new Intl.NumberFormat('az-AZ',{style:'currency',currency:'AZN'}).format(n);
  const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  async function request(path='',options={}){
    const response=await fetch('/api/credit-orders/admin'+path,{cache:'no-store',...options,headers:{...authHeaders(),'Content-Type':'application/json'}});
    const data=await response.json();if(!response.ok)throw Error(data.message||'Əməliyyat alınmadı.');return data;
  }
  async function load(){
    list.textContent='Yüklənir...';
    try{
      const data=await request('?page='+page);
      if(page>1&&!data.items.length){page=Math.max(1,Math.ceil(data.count/25));return load();}
      list.replaceChildren();
      if(!data.items.length)list.textContent='Hələ kredit sifarişi yoxdur.';
      for(const order of data.items){
        const card=el('details');card.className='credit-admin-card';
        const summary=el('summary',`${order.firstName} ${order.lastName} — ${money(order.total)} — ${statuses[order.status]||order.status}`);card.append(summary);
        const info=el('dl');
        for(const [label,value] of [['Müraciət №',String(order.number).padStart(6,'0')],['Tarix',new Date(order.createdAt).toLocaleString('az-AZ')],['Ad',order.firstName],['Soyad',order.lastName],['Ata adı',order.fatherName],['Telefon',order.phone],['FIN kod',order.fin],['SİMA',order.hasSima?'Var':'Yoxdur']]) info.append(el('dt',label),el('dd',value));
        card.append(info);const products=el('ul');
        for(const item of order.items)products.append(el('li',`${item.name} — ${item.quantity} ədəd × ${money(item.price)}${item.color?' · '+item.color:''}`));
        card.append(products);const label=el('label','Status: '), select=el('select');
        for(const [value,text] of Object.entries(statuses)){const option=el('option',text);option.value=value;select.append(option);}select.value=order.status;label.append(select);card.append(label);
        select.onchange=async()=>{select.disabled=true;try{await request('/'+encodeURIComponent(order.id),{method:'PATCH',body:JSON.stringify({status:select.value})});summary.textContent=`${order.firstName} ${order.lastName} — ${money(order.total)} — ${statuses[select.value]}`;order.status=select.value;}catch(e){select.value=order.status;showToast(e.message);}finally{select.disabled=false;}};
        const remove=el('button','Sil');remove.type='button';remove.className='credit-delete-button';
        remove.onclick=async()=>{
          if(!confirm('Müraciət № '+String(order.number).padStart(6,'0')+' silinsin? Bu əməliyyat geri qaytarılmır.'))return;
          remove.disabled=true;select.disabled=true;
          try{await request('/'+encodeURIComponent(order.id),{method:'DELETE'});showToast('Müraciət silindi.');await load();}
          catch(e){showToast(e.message);remove.disabled=false;select.disabled=false;}
        };
        card.append(remove);list.append(card);
      }
      pageInfo.textContent=`${data.count} müraciət · Səhifə ${page}`;
      document.getElementById('creditPrevious').disabled=page===1;document.getElementById('creditNext').disabled=page*25>=data.count;
    }catch(e){list.textContent=e.message;}
  }
  tab.onclick=()=>{
    document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');
    for(const id of ['productView','chatView','homeSectionsView'])document.getElementById(id).style.display='none';document.getElementById('usersView').hidden=true;view.style.display='block';
    clearTimeout(chatRefreshTimer);adminChatStreamAbort?.abort();load();
  };
  for(const id of ['productsTab','chatsTab','homeSectionsTab','usersTab'])document.getElementById(id).addEventListener('click',()=>{tab.classList.remove('active');view.style.display='none';list.replaceChildren();});
  document.getElementById('reloadCreditOrders').onclick=load;
  document.getElementById('creditPrevious').onclick=()=>{page--;load();};document.getElementById('creditNext').onclick=()=>{page++;load();};
  document.getElementById('logoutBtn').addEventListener('click',()=>{list.replaceChildren();view.style.display='none';});
})();
