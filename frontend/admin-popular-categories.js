(() => {
  'use strict';
  const tabs=document.querySelector('.admin-tabs');if(!tabs)return;
  const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const tab=el('button','Populyar kateqoriyalar');tab.id='popularCategoriesTab';tab.type='button';tab.className='admin-tab';tabs.append(tab);
  const view=el('section');view.id='popularCategoriesView';view.hidden=true;tabs.after(view);
  view.innerHTML=`<div class="popular-admin-header"><div><h2>Populyar kateqoriyalar</h2><p>Ana səhifədə görünən kartları idarə edin. Kartı çıxarmaq məhsulları və kataloq kateqoriyasını silmir.</p></div><div><a class="btn-ghost" href="/#popularCategories" target="_blank" rel="noopener">Saytda bax</a><button class="btn-primary" id="addPopularCategory" type="button">+ Kateqoriya əlavə et</button></div></div>
    <p id="popularCategoryStatus" role="status" aria-live="polite"></p><div class="popular-admin-table"><table><thead><tr><th>Şəkil</th><th>Kateqoriya</th><th>Sıra</th><th>Status</th><th>Əməliyyatlar</th></tr></thead><tbody></tbody></table></div>
    <dialog id="popularCategoryDialog" aria-labelledby="popularCategoryDialogTitle"><form id="popularCategoryForm"><h2 id="popularCategoryDialogTitle">Kateqoriya əlavə et</h2><fieldset><div class="popular-admin-fields">
      <label class="popular-admin-detail">Əsas kateqoriya<select name="category" required></select></label><label class="popular-admin-detail">Alt kateqoriya<select name="subcategory"></select></label>
      <label class="popular-admin-detail">Kartda görünən ad<input name="name" maxlength="160" required></label><label class="popular-admin-detail">Göstərilmə sırası<input name="position" type="number" min="0" max="100000" step="1" required><small>Kiçik rəqəm daha əvvəl görünür.</small></label>
      <div class="popular-admin-wide popular-image-upload"><label>Yeni şəkil<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" hidden></label><button type="button" class="btn-primary" id="choosePopularCategoryImage">Kompüterdən şəkil seç</button><span id="popularCategoryImageName">Şəkil seçilməyib</span><small>PNG, JPG və ya WebP · maksimum 2 MB. Yeni şəkil seçib “Yadda saxla” düyməsini basın.</small></div>
      <div class="popular-admin-preview"><img id="popularCategoryPreview" alt="Kartın şəkli"><label><input name="resetImage" type="checkbox"> Məhsul şəklini avtomatik seç</label></div>
      <label class="popular-admin-check popular-admin-detail"><input name="active" type="checkbox" checked> Ana səhifədə göstər</label>
    </div></fieldset><p id="popularCategoryFormStatus" role="alert"></p><div class="popular-admin-actions"><button class="btn-ghost" type="button" id="cancelPopularCategory">Ləğv et</button><button class="btn-primary" type="submit">Yadda saxla</button></div></form></dialog>`;
  const form=view.querySelector('form'),dialog=view.querySelector('dialog'),body=view.querySelector('tbody');
  const status=view.querySelector('#popularCategoryStatus'),formStatus=view.querySelector('#popularCategoryFormStatus'),preview=view.querySelector('#popularCategoryPreview');
  let rows=[],editing=null,busy=false,generation=0,previewUrl=null,imageOnly=false;
  const choices=new Map();
  function addChoice(category,subcategory='') {if(!category)return;if(!choices.has(category))choices.set(category,new Set());if(subcategory)choices.get(category).add(subcategory);}
  if(typeof ADMIN_CATEGORY_TREE!=='undefined')for(const [category,groups] of Object.entries(ADMIN_CATEGORY_TREE)) {
    addChoice(category);for(const group of groups){if(!group.items?.length)addChoice(category,group.group);for(const item of group.items||[])addChoice(category,item);}
  }
  function updateChoices() {
    for(const row of rows)addChoice(row.category,row.subcategory);
    if(typeof allProducts!=='undefined')for(const product of allProducts)addChoice(product.category,product.subcategory);
    form.elements.category.replaceChildren(new Option('Kateqoriya seçin',''));
    for(const category of choices.keys())form.elements.category.add(new Option(category,category));
  }
  function subcategories(selected='') {
    const select=form.elements.subcategory;select.replaceChildren(new Option('Bütün alt kateqoriyalar',''));
    for(const name of choices.get(form.elements.category.value)||[])select.add(new Option(name,name));select.value=selected;
  }
  async function request(path='',options={}) {
    const token=getToken();
    const response=await fetch('/api/popular-categories'+path,{cache:'no-store',...options,headers:{...authHeaders(),...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(response.status===401&&token===getToken())document.getElementById('logoutBtn').click();
    if(!response.ok)throw Error(response.status===401?'Giriş sessiyası bitib. Yenidən daxil olun.':data.message||'Əməliyyat alınmadı.');
    return data;
  }
  function setBusy(value) {busy=value;view.querySelectorAll('button').forEach(button=>button.disabled=value);form.querySelector('fieldset').disabled=value;}
  function render() {
    body.replaceChildren();
    for(const row of rows) {
      const tr=el('tr'),imageCell=el('td'),image=el('img');image.src=row.image||'/img/popular-categories/category.svg';image.alt='';
      const changeImage=el('button','Şəkli dəyiş');changeImage.type='button';changeImage.className='popular-change-image';changeImage.onclick=()=>openForm(row,true);imageCell.append(image,changeImage);
      const nameCell=el('td'),name=el('strong',row.name),path=el('small',row.category+(row.subcategory?' / '+row.subcategory:''));nameCell.append(name,path);
      const actions=el('td'),edit=el('button','Redaktə et'),toggle=el('button',row.active?'Bölmədən çıxar':'Yenidən göstər');edit.type=toggle.type='button';edit.className=toggle.className='btn-ghost';
      edit.onclick=()=>openForm(row);
      toggle.onclick=async()=>{
        if(busy)return;setBusy(true);const current=generation;
        try {await request('/'+row.id+'/visibility',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({active:!row.active})});if(current!==generation)return;await load();status.textContent=row.active?'Kart bölmədən çıxarıldı. “Yenidən göstər” ilə bərpa edə bilərsiniz.':'Kart ana səhifədə göstərilir.';}
        catch(error){status.textContent=error.message;}finally{setBusy(false);}
      };
      actions.append(edit,toggle);tr.append(imageCell,nameCell,el('td',row.position),el('td',row.active?'Göstərilir':'Gizlidir'),actions);body.append(tr);
    }
    status.textContent=rows.filter(row=>row.active).length+' kateqoriya ana səhifədə göstərilir.';
  }
  async function load() {
    const current=generation;status.textContent='Yüklənir…';
    try {const data=await request('/admin');if(current!==generation)return;rows=data;render();}
    catch(error){status.textContent=error.message;}
  }
  function releasePreview(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}}
  function openForm(row,onlyImage=false) {
    if(busy)return;editing=row?.id||null;imageOnly=onlyImage&&!!row;dialog.classList.toggle('popular-image-only',imageOnly);form.reset();formStatus.textContent='';releasePreview();updateChoices();
    form.elements.category.value=row?.category||'';subcategories(row?.subcategory||'');
    form.elements.name.value=row?.name||'';form.elements.position.value=row?.position??(rows.length?Math.min(100000,Math.max(...rows.map(r=>r.position))+1):0);
    form.elements.active.checked=row?.active??true;preview.src=row?.image||'/img/popular-categories/category.svg';
    view.querySelector('#popularCategoryImageName').textContent='Şəkil seçilməyib';
    view.querySelector('#popularCategoryDialogTitle').textContent=imageOnly?row.name+' — şəkli dəyiş':row?'Kateqoriyanı redaktə et':'Kateqoriya əlavə et';dialog.showModal();
  }
  form.elements.category.onchange=()=>{subcategories();form.elements.name.value=form.elements.category.value;};
  form.elements.subcategory.onchange=()=>{form.elements.name.value=form.elements.subcategory.value||form.elements.category.value;};
  view.querySelector('#choosePopularCategoryImage').onclick=()=>form.elements.imageFile.click();
  form.elements.imageFile.onchange=()=>{releasePreview();const file=form.elements.imageFile.files[0];view.querySelector('#popularCategoryImageName').textContent=file?.name||'Şəkil seçilməyib';if(file){previewUrl=URL.createObjectURL(file);preview.src=previewUrl;form.elements.resetImage.checked=false;}};
  form.onsubmit=async event=>{
    event.preventDefault();if(busy||!form.reportValidity())return;
    const file=form.elements.imageFile.files[0];if(file&&file.size>2*1024*1024){formStatus.textContent='Şəkil maksimum 2 MB olmalıdır.';return;}
    if(imageOnly&&!file&&!form.elements.resetImage.checked){formStatus.textContent='Yeni şəkil seçin və ya avtomatik məhsul şəklini işarələyin.';return;}
    const data=imageOnly?new FormData():new FormData(form);if(imageOnly&&file)data.set('imageFile',file);if(!imageOnly)data.set('active',String(form.elements.active.checked));data.set('resetImage',String(form.elements.resetImage.checked));if(!file)data.delete('imageFile');
    const current=generation;setBusy(true);formStatus.textContent='Saxlanılır…';
    try {await request(editing?'/'+editing+(imageOnly?'/image':''):'',{method:editing?'PATCH':'POST',body:data});if(current!==generation)return;dialog.close();releasePreview();await load();showToast(imageOnly?'Kateqoriyanın şəkli yeniləndi.':'Populyar kateqoriya saxlanıldı.');}
    catch(error){formStatus.textContent=error.message;}finally{setBusy(false);}
  };
  view.querySelector('#addPopularCategory').onclick=()=>openForm();
  view.querySelector('#cancelPopularCategory').onclick=()=>{if(!busy){dialog.close();releasePreview();}};
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();else releasePreview();});
  function openView() {
    document.getElementById('productsTab').click();document.getElementById('productView').style.display='none';
    tabs.querySelectorAll('.admin-tab').forEach(button=>button.classList.remove('active'));tab.classList.add('active');view.hidden=false;
    clearTimeout(chatRefreshTimer);adminChatStreamAbort?.abort();history.replaceState(null,'',location.pathname+location.search+'#populyar-kateqoriyalar');load();
  }
  tab.onclick=openView;
  tabs.addEventListener('click',event=>{const selected=event.target.closest('.admin-tab');if(selected&&selected!==tab){view.hidden=true;tab.classList.remove('active');if(location.hash==='#populyar-kateqoriyalar')history.replaceState(null,'',location.pathname+location.search);}});
  document.getElementById('logoutBtn').addEventListener('click',()=>{generation++;rows=[];body.replaceChildren();dialog.close();view.hidden=true;releasePreview();});
  window.addEventListener('essen:admin-session',()=>{if(location.hash==='#populyar-kateqoriyalar')openView();});
  if(getUser()?.role==='admin'&&getToken()&&location.hash==='#populyar-kateqoriyalar')openView();
})();
