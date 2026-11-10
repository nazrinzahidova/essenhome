const ORIGIN = 'https://essenhome.az';
const LIST_PATH = '/vakansiyalar.html';

function vacancyTitle(item) {
  return String(item.title || '').replace(/\s+tələb olunur[.!\s]*$/iu, '').trim();
}

function vacancyPath(item) {
  const letters = { ə:'e', ı:'i', ö:'o', ü:'u', ş:'s', ç:'c', ğ:'g' };
  const slug = vacancyTitle(item).toLocaleLowerCase('az').replace(/[əıöüçşğ]/g, c => letters[c])
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '') || 'is-elani';
  return `/vakansiyalar/${item.id}/${slug}`;
}

module.exports = { ORIGIN, LIST_PATH, vacancyTitle, vacancyPath };
