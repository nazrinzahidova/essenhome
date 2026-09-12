async function homeRequest(path = '/admin', method = 'GET', body) {
  const response = await fetch(`/api/home-sections${path}`, {
    method, cache: 'no-store', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Əməliyyat alınmadı. Yenidən cəhd edin.');
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
      row.innerHTML = `<input type="text" maxlength="120" aria-label="Bölmə adı"><span>${section._count.products} məhsul</span><label><input type="checkbox"> Aktiv</label><button class="btn-ghost" data-action="save">Saxla</button><button class="btn-ghost" data-action="up" aria-label="Yuxarı">↑</button><button class="btn-ghost" data-action="down" aria-label="Aşağı">↓</button><button class="btn-danger-outline" data-action="delete">Sil</button>`;
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
      const orderButton=document.createElement('button');orderButton.type='button';orderButton.className='btn-ghost';orderButton.textContent='Məhsulların sırası';orderButton.onclick=event=>{event.stopPropagation();openProductOrder(section.id,section.name);};row.append(orderButton);
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
