const TV_SPEC_GROUPS = [
  {
    title: 'Ümumi məlumatlar',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-DG-TVA-1118-TV-1403' },
      { key: 'Rəng', placeholder: 'məs: Qara' },
      { key: 'Komplektasiya', placeholder: 'məs: Televizor, 1x pult, TV ayaqları, naqil' },
      { key: 'İstehsalçı ölkə', placeholder: 'məs: Çin' },
      { key: 'İstehsal tarixi', placeholder: 'məs: 2025' },
      { key: 'Xüsusiyyətlər', placeholder: 'məs: Game Mode Plus, MEMC texnologiyası' },
      { key: 'Zəmanət', placeholder: 'məs: 12 ay' }
    ]
  },
  {
    title: 'Ekran',
    fields: [
      { key: 'Ekranın diaqonalı', placeholder: 'məs: 55" (140 sm)' },
      { key: 'Ekran ölçüsü', placeholder: 'məs: 55"' },
      { key: 'Ekran icazəsi', placeholder: 'məs: 4K UHD (3840 × 2160)' },
      { key: 'Tezlik', placeholder: 'məs: 165 Hz' },
      { key: 'HDR formatı', placeholder: 'məs: Dolby Vision, HDR10, HDR10+' },
      { key: 'Ekran filtr texnologiyası', options: ['OLED', 'QLED', 'QNED', 'Mini-LED', 'RGB', 'Triluminos', 'RGB LED', 'Yox'] },
      { key: 'İşıqlandırma növü', placeholder: 'məs: RGB Mini-LED' }
    ]
  },
  {
    title: 'Sistem və idarəetmə',
    fields: [
      { key: 'Əməliyyat sistemi', placeholder: 'məs: VIDAA' },
      { key: 'Smart TV', type: 'boolean' },
      { key: 'Səsli idarəetmə', type: 'boolean' },
      { key: 'Gaming TV', type: 'boolean' }
    ]
  },
  {
    title: 'Səs',
    fields: [
      { key: 'Dinamiklərin sayı', placeholder: 'məs: 2' },
      { key: 'Səs gücü', placeholder: 'məs: 20 Vt' },
      { key: 'Səs sistemi', placeholder: 'məs: Dolby MS12, DTS X' }
    ]
  },
  {
    title: 'Qoşulma və girişlər',
    fields: [
      { key: 'HDMI', placeholder: 'məs: 3' },
      { key: 'USB', placeholder: 'məs: 2' },
      { key: 'Dəstəklənən girişlər', placeholder: 'məs: HDMI x3, USB x2, LAN' },
      { key: 'Simsiz qoşulma imkanı', placeholder: 'məs: Bluetooth, Wi-Fi, Airplay' },
      { key: 'DLNA', type: 'boolean' },
      { key: 'TV tuner', placeholder: 'məs: DVB-T, DVB-T2, DVB-C, DVB-S2, DVB-S' }
    ]
  },
  {
    title: 'Ölçü, çəki və quraşdırma',
    fields: [
      { key: 'Ölçülər (altlıqsız) (E × H × D)', placeholder: 'məs: 123.4 × 71.6 × 8.1 sm' },
      { key: 'Ölçülər (altlıqla) (E × H × D)', placeholder: 'məs: 123.4 × 75.1 × 29.8 sm' },
      { key: 'Çəki (altlıqla)', placeholder: 'məs: 11 kq' },
      { key: 'VESA montaj standartı', placeholder: 'məs: 200 × 400 mm' },
      { key: 'Tövsiyə olunan baxış məsafəsi', placeholder: 'məs: 1.7 m' }
    ]
  }
];
