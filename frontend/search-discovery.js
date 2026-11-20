(() => {
  'use strict';

  function init() {
    const inputs = [...document.querySelectorAll('#searchInput,#searchInputMobile')];
    if (!inputs.length) return;

    const ru = location.pathname.startsWith('/ru/');
    const words = ru
      ? { title: 'Рекомендации поиска', terms: 'Популярные запросы', products: 'Популярные товары', categories: 'Категории', loading: 'Загрузка…' }
      : { title: 'Axtarış tövsiyələri', terms: 'Populyar axtarışlar', products: 'Populyar məhsullar', categories: 'Kateqoriyalar', loading: 'Yüklənir…' };
    const translate = value => window.EssenRu ? window.EssenRu.translate(value) : value;
    const el = (tag, text) => {
      const node = document.createElement(tag);
      if (text !== undefined) node.textContent = text;
      return node;
    };

    const panel = el('section');
    panel.id = 'searchDiscoveryPanel';
    panel.hidden = true;
    panel.setAttribute('aria-label', words.title);
    const style = el('style');
    style.textContent = `
      #searchDiscoveryPanel{position:absolute;z-index:550;top:calc(100% + 6px);left:0;width:100%;padding:18px 16px;background:#fff;border:1px solid #e5e7eb;border-radius:0 0 14px 14px;box-shadow:0 14px 30px #0002;color:#333;overflow:auto;font:14px Poppins,Arial,sans-serif}
      #searchDiscoveryPanel[hidden]{display:none!important}#searchDiscoveryPanel *{box-sizing:border-box}
      #searchDiscoveryPanel .search-discovery-main{display:grid;grid-template-columns:235px minmax(0,1fr);gap:28px;min-height:260px}
      #searchDiscoveryPanel h2{font-size:17px;font-weight:500;color:#777;margin:0 0 14px}
      #searchDiscoveryPanel ul{list-style:none;margin:0;padding:0}#searchDiscoveryPanel a{color:inherit;text-decoration:none}
      #searchDiscoveryPanel .search-term{display:flex;align-items:center;gap:12px;padding:7px 0;font-size:16px}
      #searchDiscoveryPanel .search-term svg{width:21px;height:21px;flex:none;color:#9ca3af}
      #searchDiscoveryPanel .search-featured{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding-bottom:8px;min-width:0}
      #searchDiscoveryPanel .search-featured>a{display:flex;flex-direction:column;min-width:0;scroll-snap-align:start;padding:3px}
      #searchDiscoveryPanel .search-featured img{width:100%;height:145px;object-fit:contain;margin-bottom:10px}
      #searchDiscoveryPanel .search-featured strong{font-weight:500;font-size:15px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:37px}
      #searchDiscoveryPanel del{font-size:14px;color:#888;margin-top:6px}#searchDiscoveryPanel b{font-size:17px;color:#ed163c;margin-top:3px}
      #searchDiscoveryPanel .search-discovery-categories{margin-top:24px}#searchDiscoveryPanel .search-category-links{display:flex;gap:9px;flex-wrap:wrap}
      #searchDiscoveryPanel .search-category-links a{background:#f5f5f5;border-radius:24px;padding:9px 12px;font-size:14px}
      #searchDiscoveryPanel a:hover{color:#e8222e}#searchDiscoveryPanel a:focus-visible{outline:2px solid #e8222e;outline-offset:3px;border-radius:6px}
      @media(max-width:640px){#searchDiscoveryPanel{padding:16px 14px;border-radius:0 0 12px 12px}#searchDiscoveryPanel .search-discovery-main{grid-template-columns:minmax(0,1fr);gap:20px;min-height:0}#searchDiscoveryPanel .search-terms{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 12px}#searchDiscoveryPanel .search-term{font-size:14px}#searchDiscoveryPanel .search-featured{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}#searchDiscoveryPanel .search-featured img{height:90px}#searchDiscoveryPanel .search-discovery-categories{margin-top:20px}}
    `;
    document.head.append(style);

    let active = null;
    let data = null;
    let fetching = null;
    let fetchedAt = 0;
    const originalControls = new Map(inputs.map(input => [input, input.getAttribute('aria-controls')]));

    function mount(input) {
      const host = input.parentElement;
      if (host && panel.parentElement !== host) host.append(panel);
    }

    function hide() {
      panel.hidden = true;
      if (active) {
        const old = originalControls.get(active);
        if (old) active.setAttribute('aria-controls', old);
        else active.removeAttribute('aria-controls');
        active.setAttribute('aria-expanded', 'false');
      }
      active = null;
    }

    function position() {
      if (!active) return;
      const rect = active.getBoundingClientRect();
      const available = (window.visualViewport?.height || window.innerHeight) - rect.bottom - 12;
      panel.style.maxHeight = `${Math.max(140, available)}px`;
    }

    const catalog = query => (ru ? '/ru/catalog.html' : '/catalog.html') + '?' + new URLSearchParams(query);

    function render() {
      if (!active || active.value.trim()) return hide();
      mount(active);
      panel.replaceChildren();
      if (!data) {
        panel.append(el('p', words.loading));
        panel.hidden = false;
        position();
        return;
      }

      const main = el('div');
      main.className = 'search-discovery-main';
      const terms = el('div');
      terms.append(el('h2', words.terms));
      const termList = el('ul');
      termList.className = 'search-terms';
      for (const term of data.terms) {
        const row = el('li');
        const link = el('a');
        link.className = 'search-term';
        link.href = catalog({ search: term.query });
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
        icon.setAttribute('stroke-width', '2');
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>';
        link.append(icon, el('span', translate(term.text)));
        row.append(link);
        termList.append(row);
      }
      terms.append(termList);
      main.append(terms);

      const products = el('div');
      products.append(el('h2', words.products));
      const productList = el('div');
      productList.className = 'search-featured';
      for (const product of data.products.slice(0, 3)) {
        const link = el('a');
        link.href = ru ? '/ru/product.html?id=' + encodeURIComponent(product.id) : product.url || '/product.html?id=' + encodeURIComponent(product.id);
        const image = el('img');
        image.src = product.image || '/img/popular-categories/category.svg';
        image.alt = '';
        image.loading = 'lazy';
        link.append(image, el('strong', ru && product.nameRu ? product.nameRu : translate(product.name)));
        if (Number(product.oldPrice) > Number(product.price)) link.append(el('del', Number(product.oldPrice).toFixed(2) + ' ₼'));
        link.append(el('b', Number(product.price).toFixed(2) + ' ₼'));
        productList.append(link);
      }
      products.append(productList);
      main.append(products);
      panel.append(main);

      const categories = el('div');
      categories.className = 'search-discovery-categories';
      categories.append(el('h2', words.categories));
      const categoryList = el('div');
      categoryList.className = 'search-category-links';
      for (const category of data.categories) {
        const link = el('a', translate(category.name));
        link.href = catalog({ category: category.category, ...(category.subcategory ? { subcategory: category.subcategory } : {}) });
        categoryList.append(link);
      }
      categories.append(categoryList);
      panel.append(categories);
      panel.hidden = false;
      active.setAttribute('aria-controls', panel.id);
      active.setAttribute('aria-expanded', 'true');
      position();
    }

    async function open(input) {
      if (input.value.trim()) return hide();
      active = input;
      render();
      if (data && Date.now() - fetchedAt < 15000) return;
      try {
        fetching ||= fetch('/api/search-discovery', { cache: 'no-store' })
          .then(response => { if (!response.ok) throw Error(); return response.json(); })
          .finally(() => { fetching = null; });
        data = await fetching;
        fetchedAt = Date.now();
        if (active === input) render();
      } catch {
        hide();
      }
    }

    inputs.forEach(input => {
      input.addEventListener('focus', () => open(input));
      input.addEventListener('click', () => { if (!input.value.trim()) open(input); });
      input.addEventListener('input', () => { if (input.value.trim()) hide(); else open(input); });
      input.addEventListener('keydown', event => {
        if (event.key === 'Escape') hide();
        if (event.key === 'ArrowDown' && !panel.hidden) { event.preventDefault(); panel.querySelector('a')?.focus(); }
      });
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { const input = active; hide(); input?.focus(); }
    });
    document.addEventListener('pointerdown', event => {
      if (active && !active.parentElement.contains(event.target)) hide();
    });
    document.addEventListener('focusin', event => {
      if (active && event.target !== active && !panel.contains(event.target)) hide();
    });
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
