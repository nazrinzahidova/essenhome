(() => {
 const dialog=document.createElement('dialog');dialog.id='productOrderDialog';dialog.style.cssText='width:min(760px,95vw);max-height:90dvh;border:1px solid #ddd;border-radius:16px;padding:22px;margin:auto';
 dialog.innerHTML='<h2 id="orderTitle">Məhsulların sırası</h2><p>↑ ↓ ilə yerini dəyişin və ya sıra nömrəsini yazın. Sonda “Yadda saxla” düyməsini basın.</p><p id="orderMessage" role="status"></p><div id="orderList" style="max-height:55dvh;overflow:auto;margin:16px 0"></div><button id="orderSave" class="btn-primary" type="button">Yadda saxla</button> <button id="orderClose" class="btn-ghost" type="button">Bağla</button>';document.body.append(dialog);
 const list=dialog.querySelector('#orderList'),message=dialog.querySelector('#orderMessage'),save=dialog.querySelector('#orderSave'),close=dialog.querySelector('#orderClose');let items=[],originalIds=[],scope='',activeSectionId=null,busy=false,generation=0;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 async function request(options={}){const r=await fetch('/api/product-order'+scope,{cache:'no-store',...options,headers:{...authHeaders(),'Content-Type':'application/json'}});const data=await r.json();if(!r.ok)throw Error(data.message||'Sıralama yüklənmədi.');return data;}
 function move(index,target){if(busy||!Number.isInteger(target)||target<0||target>=items.length)return;const [item]=items.splice(index,1);items.splice(target,0,item);render();list.children[target]?.scrollIntoView({block:'nearest'});message.textContent='Dəyişiklikləri yadda saxlayın.';}
 async function removeFromSection(product) {
  if (busy || activeSectionId === null) return;
  if (!confirm(`“${product.name}” bu bölmədən çıxarılsın? Məhsul kataloqda qalacaq.`)) return;
  busy = true;
  save.disabled = close.disabled = true;
  list.inert = true;
  message.textContent = 'Məhsul bölmədən çıxarılır...';
  try {
   await homeRequest(`/products/${product.id}/${activeSectionId}`, 'PUT', { selected: false });
   items = items.filter(item => item.id !== product.id);
   originalIds = originalIds.filter(id => id !== product.id);
   render();
   const orderChanged = items.some((item, index) => item.id !== originalIds[index]);
   message.textContent = orderChanged
    ? 'Məhsul bölmədən çıxarıldı. Yeni sıranı yadda saxlayın.'
    : 'Məhsul bölmədən çıxarıldı.';
   await loadHomeSectionAdmin();
  } catch (error) {
   message.textContent = error.message;
  } finally {
   busy = false;
   save.disabled = items.length === 0;
   close.disabled = false;
   list.inert = false;
  }
 }

 function render(){list.replaceChildren();items.forEach((p,index)=>{const row=el('div');row.style.cssText='display:flex;gap:8px;align-items:center;padding:10px 0;border-bottom:1px solid #eee';const rank=el('input');rank.type='number';rank.min='1';rank.max=String(items.length);rank.value=String(index+1);rank.style.cssText='width:65px;padding:7px;border:1px solid #ddd;border-radius:6px';rank.setAttribute('aria-label',p.name+' sıra nömrəsi');rank.onchange=()=>move(index,Number(rank.value)-1);const name=el('span',p.name);name.style.cssText='flex:1;min-width:0;font-size:13px';const up=el('button','↑'),down=el('button','↓');for(const b of [up,down]){b.type='button';b.className='btn-ghost';}up.setAttribute('aria-label',p.name+' yuxarı');down.setAttribute('aria-label',p.name+' aşağı');up.disabled=index===0;down.disabled=index===items.length-1;up.onclick=()=>move(index,index-1);down.onclick=()=>move(index,index+1);row.append(rank,name,up,down);
  if (activeSectionId !== null) {
   const remove = el('button', 'Bölmədən çıxar');
   remove.type = 'button';
   remove.className = 'btn-danger-outline';
   remove.setAttribute('aria-label', p.name + ' — bölmədən çıxar');
   remove.onclick = () => removeFromSection(p);
   row.append(remove);
  }
  list.append(row);});}
 window.openProductOrder=async(sectionId=null,name='')=>{if(dialog.open)return;const version=++generation;activeSectionId=sectionId;scope=sectionId===null?'':'?section='+encodeURIComponent(sectionId);dialog.querySelector('#orderTitle').textContent=sectionId===null?'Kataloqda məhsulların sırası':name+' — məhsulların sırası';items=[];originalIds=[];list.replaceChildren();save.disabled=true;message.textContent='Yüklənir...';dialog.showModal();try{const data=await request();if(version!==generation)return;items=data.items;originalIds=items.map(p=>p.id);render();message.textContent=items.length+' məhsul';save.disabled=items.length===0;}catch(e){if(version===generation)message.textContent=e.message;}};
 close.onclick=()=>{if(!busy){generation++;dialog.close();}};dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();else generation++;});
 save.onclick=async()=>{if(busy)return;busy=true;save.disabled=close.disabled=true;list.inert=true;message.textContent='Saxlanılır...';try{await request({method:'PUT',body:JSON.stringify({ids:items.map(p=>p.id),originalIds})});originalIds=items.map(p=>p.id);message.textContent='Sıralama saxlanıldı.';if(!scope)await loadProducts();}catch(e){message.textContent=e.message;}finally{busy=false;save.disabled=close.disabled=false;list.inert=false;}};
})();
