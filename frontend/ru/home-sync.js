/* The AZ homepage is the single source for homepage content and behaviour.
 * Fetch it on every visit; adapt only language and RU-relative navigation.
 * No product, banner, campaign or layout copies are maintained here.
 */
(async () => {
  'use strict';
  try {
    const requestedPage = location.pathname.split('/').pop() || 'index.html';
    const page = /^(index|catalog|product|cart|favourites|compare|haqqimizda)\.html$/.test(requestedPage) ? requestedPage : 'index.html';
    const sourceURL = new URL('../' + page + location.search, location.href);
    const response = await fetch(sourceURL, {cache: 'no-cache'});
    if (!response.ok) throw new Error('Homepage HTTP ' + response.status);
    const source = new DOMParser().parseFromString(await response.text(), 'text/html');
        const bannerProducts = {
      'samsung-tv32-192919.png': [671, 'Телевизор Samsung UE32F6000FUXRU'],
      'sem-airfryer-192746.png': [714, 'Air Fryer Sem Midocook SC-305'],
      'essen-esc01-192133.png': [715, 'Универсальный измельчитель Essen HNS ESC01']
    };
    for (const img of source.querySelectorAll('.mySwiper .swiper-slide img')) {
      const product = bannerProducts[new URL(img.getAttribute('src'), sourceURL).pathname.split('/').pop()];
      if (!product || img.closest('a')) continue;
            if (product[0] === 671) img.setAttribute('src', '/ru/samsung-tv32-54899.png');
const link = source.createElement('a');
      link.href = '/ru/product.html?id=' + product[0];
      link.setAttribute('aria-label', product[1]);
      link.title = product[1];
      link.style.cssText = 'display:block;width:100%;height:100%;';
      img.alt = product[1];
      img.replaceWith(link);
      link.appendChild(img);
    }
source.documentElement.lang = 'ru';
    source.title = 'Essen Home — бытовая техника и электроника';
    const locale = source.createElement('script');
    locale.src = new URL('locale.js?v=20260924-sync', location.href).href;
    source.head.prepend(locale);
    const localPages = /\/(index|catalog|product|cart|favourites|compare|haqqimizda)(?:\.html)?$/;
    const ruURL = value => {
      const url = new URL(value, sourceURL);
      if (url.origin === location.origin && localPages.test(url.pathname)) {
        const page = url.pathname.match(localPages)[1];
        url.pathname = '/ru/' + page + '.html';
      }
      return url.href;
    };
    for (const el of source.querySelectorAll('[src],link[href],a[href],form[action],source[srcset],img[srcset]')) {
      for (const attr of ['src','href','action']) {
        const value = el.getAttribute(attr);
        if (!value || value.startsWith('#')) continue;
        el.setAttribute(attr, el.tagName === 'A' || attr === 'action' ? ruURL(value) : new URL(value, sourceURL).href);
      }
      if (el.hasAttribute('srcset')) {
        const set = el.getAttribute('srcset');
        if (!set.startsWith('data:')) el.setAttribute('srcset', set.split(',').map(part => {
          const [url,...descriptor] = part.trim().split(/\s+/);
          return [new URL(url,sourceURL).href,...descriptor].join(' ');
        }).join(', '));
      }
    }
    source.querySelector('link[rel="canonical"]')?.setAttribute('href', location.origin + '/ru/');
    source.querySelector('meta[property="og:url"]')?.setAttribute('content', location.origin + '/ru/');
    source.querySelector('meta[property="og:locale"]')?.setAttribute('content', 'ru_RU');
    for (const key of ['og:title','twitter:title']) source.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.setAttribute('content',source.title);
    const description = 'Бытовая и кухонная техника, электроника и товары для дома Essen Home. Сравните цены и характеристики товаров.';
    for (const key of ['description','og:description','twitter:description']) source.querySelector(`meta[property="${key}"],meta[name="${key}"]`)?.setAttribute('content',description);
    if (source.getElementById('currentLanguage')) source.getElementById('currentLanguage').textContent = 'RU';
    for (const script of source.querySelectorAll('script:not([src])')) {
      if (script.type && !['text/javascript','application/javascript','module'].includes(script.type)) continue;
      script.textContent = script.textContent
        .replace('const savedLanguage = localStorage.getItem("siteLanguage") || "az";', 'const savedLanguage = "ru";')
        .replace('if (selectedLanguage === "ru") { window.location.href = "ru/index.html"; }', 'if (selectedLanguage === "az") { window.location.href = "../index.html" + location.search + location.hash; }')
        .replace(/(["'`])img\//g, '$1../img/')
        .replaceAll(".filter(Boolean).join(' ')", ".filter(Boolean).map(value => value + ' ' + EssenRu.translate(value)).join(' ')")
        .replace('(p.name && p.name.toLowerCase().includes(q)) ||', "([p.name,p.nameRu,p.category,p.subcategory].filter(Boolean).some(value => (value + ' ' + EssenRu.translate(value)).toLowerCase().includes(q))) ||")
        .replace("if (filter.search) query.set('search', filter.search);", "if (filter.search && !/[А-Яа-яЁё]/.test(filter.search)) query.set('search', filter.search);");
    }
    // Parse as a real document so the shared scripts retain their original order.
    // Only trusted same-origin application HTML is used; no API/user data is evaluated.
    document.open();
    document.write('<!DOCTYPE html>\n' + source.documentElement.outerHTML);
    document.close();
  } catch (error) {
    console.error('RU homepage loading failed', error);
    document.getElementById('home-status').textContent = 'Не удалось загрузить страницу. Обновите её и попробуйте снова.';
    document.getElementById('home-retry').hidden = false;
  }
})();
