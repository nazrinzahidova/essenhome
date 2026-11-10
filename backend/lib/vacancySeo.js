const { ORIGIN, LIST_PATH, vacancyPath, vacancyTitle } = require('./vacancyPaths');
const { renderVacancies, renderVacancyBody, escapeHtml: e } = require('./vacancies');

const listUrl = ORIGIN + LIST_PATH;
const hasSalesRole = item => /satıcı|satış məsləhətçisi/iu.test(item.title);
const json = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const clip = (value, length = 165) => value.length <= length ? value : value.slice(0, length - 1).replace(/\s+\S*$/, '') + '…';

function breadcrumbs(item) {
  const items = [{ name:'Ana səhifə', item:ORIGIN + '/' }, { name:'Vakansiyalar və iş elanları', item:listUrl }];
  if (item) items.push({ name:vacancyTitle(item), item:ORIGIN + vacancyPath(item) });
  return { '@type':'BreadcrumbList', itemListElement:items.map((entry, index) => ({ '@type':'ListItem', position:index + 1, ...entry })) };
}

function metadata(template, { title, description, url, schema, noindex = false }) {
  let html = template.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${e(title)}</title>`)
    .replace(/<link rel="canonical"[^>]*>/, () => `<link rel="canonical" href="${e(url)}">`);
  const values = { description, robots:noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large',
    'og:title':title, 'og:description':description, 'og:url':url, 'twitter:title':title, 'twitter:description':description };
  for (const [name, value] of Object.entries(values)) {
    html = html.replace(new RegExp(`<meta (?:name|property)="${name}"[^>]*>`), () => `<meta ${name.startsWith('og:') ? 'property' : 'name'}="${name}" content="${e(value)}">`);
  }
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  if (schema) html = html.replace('</head>', () => `<script type="application/ld+json">${json(schema)}</script>\n</head>`);
  return html;
}

function renderVacancyList(template, rows) {
  const sales = rows.some(hasSalesRole);
  const title = sales ? 'Satıcı vakansiyası və iş elanları | Essen Home' : 'Vakansiyalar və iş elanları | Essen Home';
  const description = sales
    ? 'Essen Home-da satıcı vakansiyası və digər aktiv iş elanları. Satış məsləhətçisi işi üçün tələblər, iş yeri və CV ilə müraciət qaydaları ilə tanış olun.'
    : 'Essen Home-da aktiv vakansiyalar və iş elanları. Vəzifə tələbləri, iş yeri, iş şəraiti və müraciət qaydaları ilə tanış olun.';
  const schema = { '@context':'https://schema.org', '@graph':[
    { '@type':'CollectionPage', '@id':listUrl+'#page', url:listUrl, name:title, description, inLanguage:'az',
      mainEntity:{ '@type':'ItemList', numberOfItems:rows.length, itemListElement:rows.map((item,index)=>({ '@type':'ListItem', position:index+1, name:vacancyTitle(item), url:ORIGIN+vacancyPath(item) })) } }, breadcrumbs()
  ] };
  let html = renderVacancies(template, rows).replace('Bizimlə birlikdə çalışın', 'Vakansiyalar və iş imkanları');
  const intro = sales
    ? 'Essen Home-da aktiv iş elanları ilə tanış olun. Satıcı və satış məsləhətçisi işi üçün tələbləri oxuyun, uyğun vakansiyaya müraciət edin.'
    : 'Essen Home komandasında iş imkanları, vəzifə tələbləri və müraciət qaydaları ilə tanış olun.';
  html = html.replace('Komandamıza qoşulmaq üçün sizə uyğun vakansiya ilə tanış olun.', intro);
  return metadata(html, { title, description, url:listUrl, schema });
}

function jobPosting(item) {
  const posted = item.publishedAt || item.createdAt;
  if (!posted || !Number.isFinite(new Date(posted).getTime())) return null;
  const description = [
    ['Vəzifə haqqında', item.description], ['Tələblər', item.requirements], ['İş şəraiti', item.benefits],
    ['İş qrafiki', item.employmentType], ['Əməkhaqqı', item.salary], ['', item.additionalNote]
  ].filter(([, value])=>value).map(([label,value])=>`<p>${label ? e(label)+': ' : ''}${e(value).replace(/\r?\n/g,'<br>')}</p>`).join('');
  const job = { '@type':'JobPosting', '@id':ORIGIN+vacancyPath(item)+'#job', url:ORIGIN+vacancyPath(item), title:vacancyTitle(item), description,
    datePosted:new Date(posted).toISOString(), identifier:{ '@type':'PropertyValue', name:'Essen Home', value:String(item.id) },
    hiringOrganization:{ '@type':'Organization', name:'Essen Home', sameAs:ORIGIN+'/', logo:ORIGIN+'/img/logo.png' },
    jobLocation:{ '@type':'Place', address:{ '@type':'PostalAddress', addressLocality:item.location, addressCountry:'AZ' } }
  };
  if (item.deadline) job.validThrough = new Date(item.deadline).toISOString();
  const employment = { 'Tam iş günü':'FULL_TIME', 'Yarım iş günü':'PART_TIME', 'Təcrübə proqramı':'INTERN' }[item.employmentType];
  if (employment) job.employmentType = employment;
  return job;
}

function renderVacancyDetail(template, item) {
  const role = vacancyTitle(item), url = ORIGIN + vacancyPath(item);
  const searchRole = /satıcı/iu.test(role) ? 'Satıcı vakansiyası' : /satış məsləhətçisi/iu.test(role) ? 'Satış məsləhətçisi vakansiyası' : `${role} — vakansiya`;
  const title = `${searchRole}${item.location ? ' — '+item.location : ''} | Essen Home`;
  const description = clip(`${role}. ${item.location} — Essen Home iş elanı. ${item.description.replace(/\s+/g,' ').trim()} CV ilə müraciət edin.`);
  const posting = jobPosting(item);
  const schema = { '@context':'https://schema.org', '@graph':[...(posting ? [posting] : []), breadcrumbs(item)] };
  let html = template.replace(/<nav class="breadcrumbs"[\s\S]*?<\/nav>/, () => `<nav class="breadcrumbs" aria-label="Səhifə yolu"><a href="/">Ana səhifə</a><span aria-hidden="true">›</span><a href="${LIST_PATH}">Vakansiyalar</a><span aria-hidden="true">›</span><span aria-current="page">${e(role)}</span></nav>`)
    .replace(/<div class="career-heading">[\s\S]*?<\/div>/, () => `<div class="career-heading"><p class="eyebrow">ESSEN HOME · İŞ ELANI</p><h1>${e(role)}</h1><p>${e([item.department,item.location,'Azərbaycan'].filter(Boolean).join(' · '))}</p></div>`)
    .replace(/<section class="vacancies-section"[\s\S]*?<\/section>/, () => `<section class="vacancies-section vacancy-detail" aria-label="Vakansiya haqqında"><article class="vacancy">${renderVacancyBody(item,true)}</article><p class="all-vacancies"><a href="${LIST_PATH}">← Bütün aktiv vakansiyalar və iş elanları</a></p></section>`);
  return metadata(html, { title, description, url, schema });
}

function renderVacancyUnavailable(template, unavailable = false) {
  const title = unavailable ? 'Vakansiya yüklənmədi' : 'Vakansiya aktiv deyil';
  const html = template.replace(/<div class="career-heading">[\s\S]*?<\/div>/, () => `<div class="career-heading"><h1>${title}</h1><p>${unavailable ? 'Bir az sonra yenidən cəhd edin.' : 'Bu elan üçün müraciət qəbulu hazırda açıq deyil.'}</p></div>`)
    .replace(/<section class="vacancies-section"[\s\S]*?<\/section>/, `<p class="all-vacancies"><a href="${LIST_PATH}">Aktiv vakansiyalara bax</a></p>`);
  return metadata(html, { title:title+' | Essen Home', description:title, url:listUrl, noindex:true });
}

function renderVacanciesSitemap(rows) {
  const urls = rows.map(item => {
    const changed = item.updatedAt || item.publishedAt || item.createdAt;
    const lastmod = changed && Number.isFinite(new Date(changed).getTime()) ? `<lastmod>${new Date(changed).toISOString()}</lastmod>` : '';
    return `<url><loc>${e(ORIGIN + vacancyPath(item))}</loc>${lastmod}</url>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

module.exports = { renderVacancyList, renderVacancyDetail, renderVacancyUnavailable, renderVacanciesSitemap, jobPosting };
