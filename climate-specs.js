const AIR_CONDITIONER_SPEC_GROUPS = [
  {
    title: 'Ümumi məlumatlar',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-MT-BMT-1198-AC-0112' },
      {
        key: 'Növ',
        label: 'Kondisionerin növü',
        options: ['Split sistemləri', 'Daxili bloklar', 'Xarici bloklar', 'Kolon tiplilər']
      },
      { key: 'Rəng', placeholder: 'məs: Ağ' },
      { key: 'Enerji istifadə sinfi', placeholder: 'məs: A' },
      { key: 'Komplektasiya', placeholder: 'Daxili blok, xarici blok, pult...' },
      { key: 'İstehsalçı ölkə', placeholder: 'məs: Çin' },
      { key: 'Xüsusiyyətlər', placeholder: 'məs: Qurutma rejimi, gecə rejimi' },
      { key: 'Zəmanət', placeholder: 'məs: 36 ay' }
    ]
  },
  {
    title: 'Funksiyalar və rejimlər',
    fields: [
      { key: 'Taymer', type: 'boolean' },
      { key: 'Wi-Fi', type: 'boolean' },
      { key: 'Əsas rejimlər', placeholder: 'məs: Soyutma, isitmə' },
      { key: 'Soyutma rejiminin gücü', placeholder: 'məs: 3.87 kVt' },
      { key: 'İsitmə rejiminin gücü', placeholder: 'məs: 4.04 kVt' }
    ]
  },
  {
    title: 'Ölçü və səs göstəriciləri',
    fields: [
      { key: 'Daxili blokun ölçüləri (H×E×D)', placeholder: 'məs: 30.8 × 83.7 × 18.9 sm' },
      { key: 'Xarici blokun ölçüləri (H×E×D)', placeholder: 'məs: 48.3 × 71.7 × 23 sm' },
      { key: 'Səs səviyyəsi (daxili blok)', placeholder: 'məs: 21 dB' },
      { key: 'Səs səviyyəsi (xarici blok)', placeholder: 'məs: 53 dB' },
      { key: 'Daxili blokun çəkisi', placeholder: 'məs: 8.42 kq' },
      { key: 'Xarici blokun çəkisi', placeholder: 'məs: 25.83 kq' }
    ]
  },
  {
    title: 'Texniki göstəricilər',
    fields: [
      { key: 'Freon növü', placeholder: 'məs: R410A' },
      { key: 'Səmərəlilik', placeholder: 'məs: 12000 BTU' },
      { key: 'Mühərrik növü', placeholder: 'məs: İnvertor' },
      {
        key: 'Tövsiyə olunan otaq sahəsi',
        type: 'areaRange'
      },
      { key: 'Quraşdırma növü', placeholder: 'məs: Divardan asılan' }
    ]
  }
];

const FAN_SPEC_GROUPS = [
  {
    title: 'Ümumi məlumatlar',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-MT-BMT-1198-AE-0017' },
      {
        key: 'Növ',
        label: 'Ventilyatorun növü',
        options: ['Döşəməüstü', 'Masaüstü', 'Qüllə', 'Universal']
      },
      { key: 'Rəng', placeholder: 'məs: Ağ' },
      { key: 'İstehsalçı ölkə', placeholder: 'məs: Çin' },
      { key: 'Zəmanət', placeholder: 'məs: 12 ay' }
    ]
  },
  {
    title: 'Ölçü və güc',
    fields: [
      { key: 'Hündürlük', placeholder: 'məs: 125 sm' },
      { key: 'Güc', placeholder: 'məs: 45 Vt' },
      { key: 'Ölçülər (H × E × D)', placeholder: 'məs: 48 × 11 × 51 sm' },
      { key: 'Naqilin uzunluğu', placeholder: 'məs: 1.8 m' },
      { key: 'Pərin diametri', placeholder: 'məs: 43 sm' }
    ]
  },
  {
    title: 'İdarəetmə və funksiyalar',
    fields: [
      {
        key: 'İdarəetmə növü',
        options: ['Mexaniki', 'Elektron', 'Pultla', 'Mobil tətbiq']
      },
      { key: 'Sürət sayı', placeholder: 'məs: 3' },
      { key: 'Tənzimləmə', placeholder: 'məs: Hündürlük, əyilmə, dönmə' },
      { key: 'Xüsusiyyətlər', placeholder: 'məs: Uzaqdan idarəolunma' },
      { key: 'Avtomatik sönmə', type: 'boolean' },
      { key: 'Həddindən artıq qızmaya qarşı qorunma', type: 'boolean' }
    ]
  }
];

const AIR_TREATMENT_SPEC_GROUPS = [
  {
    title: 'Ümumi məlumatlar',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-MT-BMT-1198-AG-0008' },
      { key: 'Güc', placeholder: 'məs: 20 Vt' },
      { key: 'Displey', type: 'boolean' },
      { key: 'Rəng', placeholder: 'məs: Ağ' },
      { key: 'Enerji istehlakı', placeholder: 'məs: 46 Vt' },
      { key: 'Çəki', placeholder: 'məs: 3.2 kq' },
      { key: 'Zəmanət', placeholder: 'məs: 36 ay' }
    ]
  },
  {
    title: 'İş göstəriciləri',
    fields: [
      { key: 'Su çəninin həcmi', placeholder: 'məs: 2.3 lt' },
      { key: 'Xidmət olunan sahə', placeholder: 'məs: 40 m²' },
      { key: 'Məhsuldarlıq', placeholder: 'məs: 306 m³/saat' },
      { key: 'Rejim sayı', placeholder: 'məs: 3' },
      { key: 'Su istehlakı', placeholder: 'məs: 200 ml/s' },
      { key: 'Su sərfiyyatı', placeholder: 'məs: 500 ml/saat' }
    ]
  },
  {
    title: 'Ölçü və funksiyalar',
    fields: [
      { key: 'Ölçülər (H × E × D)', placeholder: 'məs: 56 × 36 × 24 sm' },
      { key: 'Xüsusiyyətlər', placeholder: 'məs: Gecə rejimi' },
      { key: 'İndikatorlar', placeholder: 'məs: Aşağı su səviyyəsi' },
      { key: 'Taymer', type: 'boolean' },
      { key: 'Əlavə funksiyalar', placeholder: 'məs: Nəmləndirmə, aromatizasiya' },
      { key: 'Filterin mövcud olması', placeholder: 'məs: HEPA, kömür filtri' },
      { key: 'Uzaqdan idarəedici', type: 'boolean' }
    ]
  }
];

const CHILD_HUMIDIFIER_SPEC_GROUPS = [
  {
    title: 'Uşaq üçün hava nəmləndiricisi',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-DG-UAM-1119-HN-0006' },
      { key: 'Çəki', placeholder: 'məs: 1.1 kq' },
      { key: 'Xüsusiyyətlər', placeholder: 'məs: Quraşdırılmış ətirləndirici' },
      { key: 'Ölçülər', placeholder: 'məs: 23 × 23 × 30 sm' },
      { key: 'Zəmanət', placeholder: 'məs: 12 ay / Yox' }
    ]
  }
];
