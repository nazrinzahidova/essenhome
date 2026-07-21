const SMARTPHONE_SPEC_GROUPS = [
  {
    title: 'Ümumi məlumatlar',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-DG-SBP-J105-SM-3289' },
      { key: 'Rəng', placeholder: 'məs: Silver' },
      { key: 'Çəki', placeholder: 'məs: 162 qr' },
      { key: 'İstehsal ili', placeholder: 'məs: 2025' },
      { key: 'Komplektasiya', placeholder: 'Smartfon, USB Type-C naqili...' },
      { key: 'Seriya', placeholder: 'məs: Samsung Galaxy S25' },
      { key: 'Zəmanət', placeholder: 'məs: 12 ay' },
      { key: 'Korpusun materialı', placeholder: 'məs: Alüminium və şüşə' },
      { key: 'Ölçülər', placeholder: 'məs: 146.9 × 70.5 × 7.2 mm' },
      { key: 'Qorunma dərəcəsi', placeholder: 'məs: IP68' }
    ]
  },
  {
    title: 'Sistem və prosessor',
    fields: [
      { key: 'Əməliyyat sistemi', placeholder: 'məs: Android' },
      { key: 'Əməliyyat sisteminin versiyası', placeholder: 'məs: Android 15' },
      { key: 'Prosessorun adı', placeholder: 'məs: Qualcomm' },
      { key: 'Prosessorun növü', placeholder: 'məs: Snapdragon 8 Elite' },
      { key: 'Nüvə sayı', placeholder: 'məs: 8' }
    ]
  },
  {
    title: 'Ekran və yaddaş',
    fields: [
      { key: 'Ekran', placeholder: 'məs: 6.2"' },
      { key: 'Displey növü', placeholder: 'məs: Dynamic AMOLED 2X' },
      { key: 'Görüntü imkanı', placeholder: 'məs: 1080 × 2340' },
      { key: 'Operativ yaddaş', placeholder: 'məs: 12 GB' },
      { key: 'Daxili yaddaş', placeholder: 'məs: 256 GB' },
      { key: 'Yaddaş kartı dəstəyi', type: 'boolean' }
    ]
  },
  {
    title: 'Kamera və video',
    fields: [
      { key: 'Əsas kamera', placeholder: 'məs: 50 MP + 10 MP + 12 MP' },
      { key: 'Ön kamera', placeholder: 'məs: 12 MP' },
      { key: 'Avtofokus əsas kamera', type: 'boolean' },
      { key: 'Optik sabitləşmə', type: 'boolean' },
      { key: 'Video formatı', placeholder: 'məs: 8K' },
      { key: 'Video icazəsi və kadr tezliyi', placeholder: 'məs: 8K, 30-240 kadr/s' },
      { key: 'Video asta çəkiliş', type: 'boolean' }
    ]
  },
  {
    title: 'Batareya və enerji',
    fields: [
      { key: 'Akkumulyatorun tutumu', placeholder: 'məs: 4000 mAh' },
      { key: 'Batareya növü', placeholder: 'məs: Li-Ion' },
      { key: 'Enerji yığma gücü', placeholder: 'məs: 25 Vt' },
      { key: 'Enerji toplama növü', placeholder: 'məs: USB Type-C' },
      { key: 'Sürətli enerji yığma', type: 'boolean' },
      { key: 'Simsiz enerji', type: 'boolean' }
    ]
  },
  {
    title: 'Əlaqə və interfeyslər',
    fields: [
      { key: 'NFC', type: 'boolean' },
      { key: 'Bluetooth versiyası', placeholder: 'məs: 5.4' },
      { key: 'Şəbəkə standartı', placeholder: 'məs: 5G' },
      { key: 'SIM-kart sayı', placeholder: 'məs: 2' },
      { key: 'SIM-kart növü', placeholder: 'məs: Nano SIM + eSIM' },
      { key: 'Qulaqlıq interfeysi', placeholder: 'məs: USB Type-C' },
      { key: 'İnfraqırmızı port', type: 'boolean' }
    ]
  },
  {
    title: 'Sensorlar və təhlükəsizlik',
    fields: [
      { key: 'Barmaq izi oxuyucusu', placeholder: 'məs: Displeydə / Yox' },
      { key: 'Üz tanıma', type: 'boolean' },
      { key: 'Giroskop', type: 'boolean' },
      { key: 'Akselerometr', type: 'boolean' },
      { key: 'İşıq sensoru', type: 'boolean' },
      { key: 'Yaxınlaşdırma sensoru', type: 'boolean' }
    ]
  }
];
