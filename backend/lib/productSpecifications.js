const headlineFields = [
  [/^çamaşırların maksimum yüklənməsi$|^yuma tutumu$/, 'Yuma tutumu'],
  [/^ekranın diaqonalı$|^ekran ölçüsü$|^ekran$/, 'Ekran'],
  [/^daxili yaddaş$|^yaddaş tutumu$|^ssd tutumu$/, 'Yaddaş'],
  [/^ümumi (faydalı )?(həcm|tutum)$|^tutum(u)?$|^həcm(i)?$/, 'Tutum'],
  [/^soyutma gücü$|^güc(ü)?$/, 'Güc']
];

const summaryFields = [
  ...headlineFields,
  [/^çamaşırların qurutma zamanı maksimum yüklənməsi$|^qurutma tutumu$/, 'Qurutma tutumu'],
  [/^operativ yaddaş$|^ram$/, 'Operativ yaddaş'],
  [/^ekran icazəsi$|^görüntü imkanı$|^ekranın ayırdetmə qabiliyyəti$/, 'Ekran icazəsi'],
  [/^prosessor(un növü)?$|^maksimal sıxma sürəti$|^tezlik$|^rəng$|^batareya tutumu$|^enerji istifadə sinfi$/, null]
];

function specValue(value) {
  if (typeof value === 'boolean') return value ? 'Var' : 'Yox';
  if (typeof value === 'string' || typeof value === 'number') {
    const cleaned = String(value).replace(/\s+/g, ' ').trim();
    return /^[-–—]+$/.test(cleaned) ? '' : cleaned;
  }
  return value && typeof value === 'object' ? Object.values(value).map(specValue).filter(Boolean).join(', ') : '';
}

function productSpecifications(specs) {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return [];
  return Object.entries(specs).map(([name, value]) => [name.trim(), specValue(value)])
    .filter(([name, value]) => name && name.toLocaleLowerCase('az') !== 'sku' && value);
}

function specificationHighlights(specs) {
  const highlights = new Map();
  let headline = '';
  for (const [pattern, label] of summaryFields) {
    const match = specs.find(([name, value]) => pattern.test(name.toLocaleLowerCase('az')) && value.length <= 40 && !/^(var|yox|xeyr|bəli)$/i.test(value));
    if (!match) continue;
    const [name, value] = match;
    if (!headline && headlineFields.some(([field]) => field === pattern)) headline = value;
    highlights.set(label || name, value);
  }
  if (!highlights.size) {
    for (const [name, value] of specs) {
      if (value.length <= 40 && !/^(var|yox|xeyr|bəli)$/i.test(value) && !/^(model(i| adı| adi)?|komplektasiya|istehsalçı ölkə|zəmanət)$/i.test(name)) {
        highlights.set(name, value);
      }
      if (highlights.size === 3) break;
    }
  }
  return { headline, summary: Array.from(highlights, ([name, value]) => `${name}: ${value}`) };
}

module.exports = { productSpecifications, specificationHighlights };
