// Brend uses the existing Product.brand field.
const VACUUM_SPEC_GROUPS = [
  {
    "title": "Tozsoran xüsusiyyətləri",
    "fields": [
      {
        "key": "İstehsalçı ölkə",
        "placeholder": "məs: Vyetnam"
      },
      {
        "key": "Güc",
        "placeholder": "məs: 1600 Vt"
      },
      {
        "key": "Sorma gücü",
        "placeholder": "məs: 350 Vt"
      },
      {
        "key": "Toz qabının həcmi",
        "placeholder": "məs: 1.3 lt"
      },
      {
        "key": "Toz qabının növü",
        "placeholder": "məs: Konteyner"
      },
      {
        "key": "Təmizləmə növü",
        "placeholder": "məs: Quru"
      },
      {
        "key": "Güc tənzimləyicisi",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Naqilin uzunluğu",
        "placeholder": "məs: 6 m"
      },
      {
        "key": "Səs səviyyəsi",
        "placeholder": "məs: 82 dB"
      },
      {
        "key": "Çəki",
        "placeholder": "məs: 4.3 kq"
      },
      {
        "key": "Rəng",
        "placeholder": "məs: Göy"
      },
      {
        "key": "Çıxış filtri",
        "placeholder": "məs: HEPA"
      },
      {
        "key": "Borunun materialı",
        "placeholder": "məs: Polad"
      },
      {
        "key": "Ölçülər (H × E × D)",
        "placeholder": "məs: 39 × 24.6 × 28.4 sm"
      },
      {
        "key": "Başlıqlar",
        "placeholder": "məs: Döşəmə/xalça fırçası"
      },
      {
        "key": "Xüsusiyyətlər",
        "placeholder": "məs: Twin Chamber System"
      },
      {
        "key": "Zəmanət",
        "placeholder": "məs: 12 ay"
      }
    ]
  }
];

function isVacuumProduct(item) {
  return String(item.subcategory || item.category || '').trim().toLocaleLowerCase('az') === 'tozsoranlar';
}

function vacuumSpecEntries(item) {
  const specs = item.specs && typeof item.specs === 'object' && !Array.isArray(item.specs) ? item.specs : {};
  return ['Brend', ...VACUUM_SPEC_GROUPS.flatMap(group => group.fields.map(field => field.key))]
    .map(key => {
      const value = key === 'Brend' ? (item.brand || specs[key]) : specs[key];
      return [key, value !== null && value !== undefined && String(value).trim() ? value : '-'];
    });
}
