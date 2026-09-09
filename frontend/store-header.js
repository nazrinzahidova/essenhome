(() => {
  const header = document.querySelector('.eh-header');
  if (!header) return;
  const $ = id => document.getElementById(id);
  const auth = window.EssenPhoneAuth.mount({openLoginModal:$('openLoginModal'),loginModal:$('loginModal'),loginMessage:$('loginMessage'),closeLoginModal:$('closeLoginModal')});
  $('openLoginModal').addEventListener('click', auth.openModal);
  const language = localStorage.getItem('siteLanguage') || 'az';
  header.querySelector('.eh-language-label').textContent = language.toUpperCase();
  header.querySelectorAll('[data-language]').forEach(link => link.addEventListener('click', () => localStorage.setItem('siteLanguage', link.dataset.language)));
  const toggle = header.querySelector('.eh-catalog-toggle');
  const catalog = $('eh-catalog');
  const closeCatalog = () => { catalog.hidden = true; toggle.setAttribute('aria-expanded','false'); };
  toggle.addEventListener('click', () => { catalog.hidden = !catalog.hidden; toggle.setAttribute('aria-expanded',String(!catalog.hidden)); });
  const list = header.querySelector('.eh-category-list');
  if (typeof CATEGORY_TREE !== 'undefined') Object.keys(CATEGORY_TREE).forEach(category => {
    const link = document.createElement('a'); link.href = '/catalog.html?category=' + encodeURIComponent(category); link.textContent = category === 'Yay sərinliyi' ? 'Kondisionerlər' : category; list.append(link);
  });
  document.addEventListener('click', event => { if (!catalog.contains(event.target) && !toggle.contains(event.target)) closeCatalog(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeCatalog(); header.querySelector('.eh-language').open = false; } });
  const payment = document.querySelector('.eh-payment');
  header.querySelector('.eh-monthly').addEventListener('click', () => payment.showModal());
  payment.querySelector('button').addEventListener('click', () => payment.close());
  const form = header.querySelector('.eh-search');
  if (!form) return; // The product page keeps its existing live search.
  const input = form.querySelector('input');
  const results = form.querySelector('.eh-results');
  let products, timer, generation = 0;
  input.addEventListener('input', () => {
    clearTimeout(timer); const version = ++generation;
    if (input.value.trim().length < 2) { results.hidden = true; return; }
    timer = setTimeout(async () => {
      try {
        products ||= fetch('/api/products').then(response => { if (!response.ok) throw Error(); return response.json(); });
        const items = await products;
        if (version !== generation) return;
        const needle = input.value.trim().toLocaleLowerCase('az');
        const matches = items.filter(item => [item.name,item.brand].join(' ').toLocaleLowerCase('az').includes(needle)).slice(0,6);
        results.replaceChildren();
        for (const item of matches) { const link = document.createElement('a'); link.href='/product.html?id='+encodeURIComponent(item.id); link.textContent=item.name+' — '+item.price+' ₼'; results.append(link); }
        const all = document.createElement('a'); all.href='/catalog.html?search='+encodeURIComponent(input.value.trim()); all.textContent='Bütün nəticələrə bax'; results.append(all); results.hidden=false;
      } catch { products=null; results.hidden=true; }
    },180);
  });
  form.addEventListener('submit', event => { if (!input.value.trim()) event.preventDefault(); });
  document.addEventListener('click', event => { if (!form.contains(event.target)) { results.hidden=true; generation++; } });
  input.addEventListener('keydown', event => { if(event.key==='Escape') { results.hidden=true; generation++; } });
})();
