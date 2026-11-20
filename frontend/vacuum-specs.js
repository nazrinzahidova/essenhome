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

const VERTICAL_VACUUM_SPEC_GROUPS = [
  {
    title: 'Ətraflı məlumat',
    fields: [
      { key: 'İstehsalçı ölkə', placeholder: 'məs: Çin' },
      { key: 'Su qabının həcmi', placeholder: 'məs: 0.3 lt' },
      { key: 'Naqilin uzunluğu', placeholder: 'məs: 5 m' },
      { key: 'Rəng', placeholder: 'məs: Ağ' },
      { key: 'Hərəkət rejimləri', placeholder: 'məs: 3' },
      { key: 'Texnologiya', placeholder: 'məs: Siklon' },
      { key: 'Növ', placeholder: 'məs: Naqilsiz' },
      { key: 'Maksimal işləmə müddəti', placeholder: 'məs: 35 dəq' },
      { key: 'İdarəetmə növü', placeholder: 'məs: Mexaniki' },
      { key: 'Ölçülər (H × E × D)', placeholder: 'məs: 70 × 21 × 28 sm' },
      { key: 'Xüsusiyyətlər', placeholder: 'məs: Turbo fırçanın LED işıqlandırması' },
      { key: 'Sorma gücü', placeholder: 'məs: 29 Vt' },
      { key: 'Toz qabının həcmi', placeholder: 'məs: 0.5 lt' },
      { key: 'Nəm təmizləmə', type: 'boolean' },
      { key: 'Enerji yığma müddəti', placeholder: 'məs: 4 saatadək' },
      { key: 'Toz qabının növü', placeholder: 'məs: Konteyner' },
      { key: 'Təmizlik növü', placeholder: 'məs: Quru' },
      { key: 'Komplektasiya', placeholder: 'məs: Tozsoran, adapter, başlıqlar' },
      { key: 'Güc tənzimləyicisi', type: 'boolean' },
      { key: 'Çəki', placeholder: 'məs: 3.9 kq' },
      { key: 'Gücü (Vt)', placeholder: 'məs: 85 Vt' },
      { key: 'Başlıqlar', placeholder: 'məs: Döşəmə və xalça üçün, ara üçün, turbofırça' },
      { key: 'Çıxış filtri', placeholder: 'məs: HEPA' },
      { key: 'Akkumulyatorun gərginliyi', placeholder: 'məs: 25.2 V' },
      { key: 'Navigasiya sistemi', placeholder: 'məs: Sensorlu' },
      { key: 'Səs səviyyəsi', placeholder: 'məs: 75 dB' },
      { key: 'Su damcılama sistemi ilə mikrofibralı parça', type: 'boolean' },
      { key: 'Zəmanət', placeholder: 'məs: 12 ay' }
    ]
  }
];

function vacuumSpecGroupsFor(item) {
  const subcategory = String(item?.subcategory || '').trim().toLocaleLowerCase('az');
  return subcategory === 'vertikal tozsoranlar' ? VERTICAL_VACUUM_SPEC_GROUPS : VACUUM_SPEC_GROUPS;
}

function isVacuumProduct(item) {
  return ['tozsoranlar', 'vertikal tozsoranlar'].includes(
    String(item.subcategory || item.category || '').trim().toLocaleLowerCase('az')
  );
}

function vacuumSpecEntries(item) {
  const specs = item.specs && typeof item.specs === 'object' && !Array.isArray(item.specs) ? item.specs : {};
  return ['Brend', ...vacuumSpecGroupsFor(item).flatMap(group => group.fields.map(field => field.key))]
    .map(key => {
      const value = key === 'Brend' ? (item.brand || specs[key]) : specs[key];
      return [key, value !== null && value !== undefined && String(value).trim() ? value : '-'];
    });
}
