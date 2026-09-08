// Brend uses the shared admin brand selector and Product.brand.
const FREEZER_SPEC_GROUPS = [
  {
    "title": "Əsas xüsusiyyətlər",
    "fields": [
      {
        "key": "Quraşdırılma növü",
        "placeholder": "məs: Solo"
      },
      {
        "key": "Kompressorların sayı",
        "placeholder": "məs: 1"
      },
      {
        "key": "Kameraların sayı",
        "placeholder": "məs: 1"
      },
      {
        "key": "Qapıların sayı",
        "placeholder": "məs: 1"
      },
      {
        "key": "Rəng",
        "placeholder": "məs: Ağ"
      },
      {
        "key": "Çəki",
        "placeholder": "məs: 21 kq"
      },
      {
        "key": "Displey",
        "placeholder": "məs: Yox"
      },
      {
        "key": "Buz generatoru",
        "placeholder": "məs: Yox"
      },
      {
        "key": "Faydalı həcmi",
        "placeholder": "məs: 98 lt"
      },
      {
        "key": "Rəflərin materialı",
        "placeholder": "məs: Metal"
      },
      {
        "key": "Hündürlük",
        "placeholder": "məs: 85 sm"
      },
      {
        "key": "En",
        "placeholder": "məs: 55 sm"
      },
      {
        "key": "Dərinlik",
        "placeholder": "məs: 55 sm"
      },
      {
        "key": "Kompressor tipi",
        "placeholder": "məs: Hermetik"
      },
      {
        "key": "Qapının materialı",
        "placeholder": "məs: Metal, plastik"
      },
      {
        "key": "İdarəetmə növü",
        "placeholder": "məs: Mexaniki"
      },
      {
        "key": "Əritmə sistemi",
        "placeholder": "məs: Defrost"
      },
      {
        "key": "Əlavə xüsusiyyətlər",
        "placeholder": "məs: Aşağı səs səviyyəsi"
      },
      {
        "key": "Toplam həcm",
        "placeholder": "məs: 99 lt"
      },
      {
        "key": "Qapı istiqamətinin dəyişdirilməsi",
        "placeholder": "məs: Yox"
      },
      {
        "key": "İstehsalçı ölkə",
        "placeholder": "məs: Çin"
      },
      {
        "key": "Növ",
        "placeholder": "məs: Üfüqi"
      },
      {
        "key": "Ölçülər (H × E × D)",
        "placeholder": "məs: 85 × 55 × 55 sm"
      },
      {
        "key": "İqlim sinfi",
        "placeholder": "məs: ST"
      },
      {
        "key": "Səs səviyyəsi",
        "placeholder": "məs: 42 dB"
      },
      {
        "key": "Zəmanət",
        "placeholder": "məs: 36 ay"
      }
    ]
  }
];

function isFreezerProduct(item) {
  return String(item.subcategory || item.category || '').trim().toLocaleLowerCase('az') === 'dondurucular';
}

function freezerSpecEntries(item) {
  const specs = item.specs && typeof item.specs === 'object' && !Array.isArray(item.specs) ? item.specs : {};
  return ['Brend', ...FREEZER_SPEC_GROUPS.flatMap(group => group.fields.map(field => field.key))]
    .map(key => {
      const value = key === 'Brend' ? (item.brand || specs[key]) : specs[key];
      return [key, value !== null && value !== undefined && String(value).trim() ? value : '-'];
    });
}
