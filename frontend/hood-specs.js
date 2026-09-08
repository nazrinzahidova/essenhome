// Brend uses the existing admin f_brand field and Product.brand column.
const HOOD_SPEC_GROUPS = [
  {
    title: 'Əsas xüsusiyyətlər',
    fields: [
      { key: 'Növ', placeholder: 'məs: Teleskopik' },
      { key: 'İş rejimi', placeholder: 'məs: Sovurma, resirkulyasiya' },
      { key: 'Məhsuldarlıq', placeholder: 'məs: 302 m³/saat' },
      { key: 'İdarəetmə növü', placeholder: 'məs: Mexaniki' },
      { key: 'Sürət sayı', placeholder: 'məs: 3' },
      { key: 'Korpusun materialı', placeholder: 'məs: Paslanmayan polad' },
      { key: 'En', placeholder: 'məs: 54 sm' },
      { key: 'Hava kanalının diametri', placeholder: 'məs: 120 mm' },
      { key: 'Səs səviyyəsi', placeholder: 'məs: 62 dB' },
      { key: 'Ölçülər (H × E × D)', placeholder: 'məs: 20.8 × 53.4 × 30 sm' },
      { key: 'Rəng', placeholder: 'məs: Gümüşü' },
      { key: 'Zəmanət', placeholder: 'məs: 36 ay' }
    ]
  }
];

function isHoodProduct(item) {
  return String(item.subcategory || item.category || '').trim().toLocaleLowerCase('az') === 'aspiratorlar';
}

function hoodSpecEntries(item) {
  const specs = item.specs && typeof item.specs === 'object' && !Array.isArray(item.specs) ? item.specs : {};
  return ['Brend', ...HOOD_SPEC_GROUPS.flatMap(group => group.fields.map(field => field.key))]
    .map(key => {
      const value = key === 'Brend' ? (item.brand || specs[key]) : specs[key];
      return [key, value !== null && value !== undefined && String(value).trim() ? value : '-'];
    });
}
