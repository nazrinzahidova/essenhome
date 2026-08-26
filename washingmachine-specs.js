const WASHING_MACHINE_SPEC_GROUPS = [
  {
    title: 'Ümumi məlumatlar',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-MT-PM-0001' },
      { key: 'Brend', placeholder: 'məs: Samsung' },
      {
        key: 'Növ',
        options: ['Paltaryuyan maşın', 'Paltaryuyan və quruducu maşın']
      },
      { key: 'Display', type: 'boolean' },
      { key: 'Rəng', placeholder: 'məs: Ağ' },
      { key: 'İstehsalçı ölkə', placeholder: 'məs: Çin' },
      { key: 'Xüsusiyyətlər', placeholder: 'məs: İnvertor mühərrik, ağıllı diaqnostika' },
      { key: 'Zəmanət', placeholder: 'məs: 36 ay' }
    ]
  },
  {
    title: 'Ölçülər və quraşdırılma',
    fields: [
      { key: 'Hündürlük', placeholder: 'məs: 85 sm' },
      { key: 'Ölçülər (H×E×D)', placeholder: 'məs: 85 × 60 × 55 sm' },
      { key: 'En', placeholder: 'məs: 60 sm' },
      { key: 'Dərinlik', placeholder: 'məs: 55 sm' },
      { key: 'Yükləmə növü', options: ['Öndən', 'Üstdən'] },
      { key: 'Quraşdırılma növü', options: ['Solo'] }
    ]
  },
  {
    title: 'Yuma və sıxma göstəriciləri',
    fields: [
      { key: 'Proqramların sayı', placeholder: 'məs: 14' },
      { key: 'Maksimal sıxma sürəti', placeholder: 'məs: 1400 dövr/dəq' },
      { key: 'Yuma zamanı səs səviyyəsi', placeholder: 'məs: 54 dB' },
      { key: 'Yuma sinfi', placeholder: 'məs: A' },
      { key: 'Sıxma sürəti sinfi', placeholder: 'məs: B' },
      { key: 'Sıxma zamanı səs səviyyəsi', placeholder: 'məs: 72 dB' },
      { key: 'Yuma zamanı yükləmə imkanı', type: 'boolean' },
      { key: 'Yuma zamanı su sərfiyyatı', placeholder: 'məs: 48 l' },
      { key: 'Sıxma sürətinin seçimi', type: 'boolean' },
      { key: 'Çamaşırların maksimum yüklənməsi', placeholder: 'məs: 9 kq' }
    ]
  },
  {
    title: 'Qurutma',
    fields: [
      { key: 'Qurutma növü', options: ['Yoxdur', 'Kondensasiya', 'İstilik nasosu'] },
      { key: 'Çamaşırların qurutma zamanı maksimum yüklənməsi', placeholder: 'məs: 6 kq' }
    ]
  },
  {
    title: 'Funksiyalar və idarəetmə',
    fields: [
      { key: 'Wi-Fi', type: 'boolean' },
      { key: 'Mühərrik növü', options: ['İnvertor', 'Kollektor', 'Birbaşa ötürücü'] },
      { key: 'Uşaq kilidi', type: 'boolean' },
      { key: 'Uşaq geyiminin yuyulması proqramı', type: 'boolean' },
      { key: 'Qalıq zamanın göstəricisi', type: 'boolean' },
      { key: 'Gecikdirilmiş start', type: 'boolean' },
      { key: 'Enerji istifadə sinfi', placeholder: 'məs: A' },
      { key: 'Buxarla yuma', type: 'boolean' }
    ]
  }
];
