const GAME_CONSOLE_SPEC_GROUPS = [
  {
    title: 'Ümumi məlumatlar',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-DG-GAF-1106-GC-0097' },
      { key: 'Növ', options: ['Portativ', 'Stasionar'] },
      { key: 'Rəng', placeholder: 'məs: Göy' },
      { key: 'Çəki', placeholder: 'məs: 208 qr' },
      { key: 'Xüsusiyyətlər', placeholder: 'məs: TV-yə qoşulma imkanı' },
      { key: 'Ölçülər', placeholder: 'məs: 163 × 79 × 16 mm' },
      { key: 'Seriya', placeholder: 'məs: Nintendo Switch' },
      { key: 'Zəmanət', placeholder: 'məs: 12 ay' }
    ]
  },
  {
    title: 'Əlaqə və interfeyslər',
    fields: [
      { key: 'İnterfeys', placeholder: 'məs: USB Type-C, HDMI, microSD' },
      { key: 'Bluetooth', type: 'boolean' },
      { key: 'Wi-Fi', placeholder: 'məs: Wi-Fi 6 (802.11ax)' },
      { key: 'AV Port', type: 'boolean' },
      { key: 'Optik disk növü', placeholder: 'məs: microSD / Yox' }
    ]
  },
  {
    title: 'Prosessor və yaddaş',
    fields: [
      { key: 'Prosessor', placeholder: 'məs: NVIDIA Tegra T239' },
      { key: 'Qrafik prosessor', placeholder: 'məs: NVIDIA Ampere' },
      { key: 'Operativ yaddaş', placeholder: 'məs: 12 GB' },
      { key: 'Daxili yaddaş', placeholder: 'məs: 256 GB' },
      { key: 'Video yaddaş', placeholder: 'məs: 8 GB / Yox' }
    ]
  },
  {
    title: 'Görüntü, səs və enerji',
    fields: [
      { key: 'Qidalanma növü', placeholder: 'məs: Akkumulyator' },
      { key: 'Səs formatları', placeholder: 'məs: MP3, WAV, FLAC, Dolby Atmos' },
      { key: 'Görüntü imkanı', placeholder: 'məs: 1920 × 1080' },
      { key: 'Çıxış görüntü imkanı', placeholder: 'məs: 4K' },
      { key: 'Akkumulyatorla işləmə müddəti', placeholder: 'məs: 6.5 saatadək' }
    ]
  }
];

const GAMING_MONITOR_SPEC_GROUPS = [
  {
    title: 'Ümumi məlumatlar',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-DG-KOT-1114-MR-0451' },
      { key: 'Növ', placeholder: 'məs: Oyun üçün' },
      { key: 'Rəng', placeholder: 'məs: Black' },
      { key: 'Xüsusiyyətlər', placeholder: 'məs: FreeSync, Low Blue Light' },
      { key: 'Zəmanət', placeholder: 'məs: 12 ay' },
      { key: 'Model', placeholder: 'məs: G24i' }
    ]
  },
  {
    title: 'Ekran',
    fields: [
      { key: 'Display növü', placeholder: 'məs: IPS' },
      { key: 'Sensorlu ekran', type: 'boolean' },
      { key: 'Tezlik', placeholder: 'məs: 200 Hz' },
      { key: 'Əyri ekran', type: 'boolean' },
      { key: 'Kontrastlıq', placeholder: 'məs: 1000:1' },
      { key: 'Parlaqlıq', placeholder: 'məs: 400 kd/m²' },
      { key: 'Piksel sürəti', placeholder: 'məs: 1 ms' },
      { key: 'Diaqonal', placeholder: 'məs: 23.8\"' },
      { key: 'Maksimal rəng sayı', placeholder: 'məs: 16.7 mln' },
      { key: 'Görüntü imkanı', placeholder: 'məs: 1920 × 1080' },
      { key: 'İşıqlandırma', placeholder: 'məs: LED' },
      { key: 'Baxış bucağı', placeholder: 'məs: 178°/178°' }
    ]
  },
  {
    title: 'Konstruksiya və bağlantılar',
    fields: [
      { key: 'Portlar', placeholder: 'məs: 1x HDMI, 1x DisplayPort, 3.5 mm (mini jack)' },
      { key: 'Ölçülər (altlıqla) (E × H × D)', placeholder: 'məs: 53.92 × 44.15 × 10.54 sm' }
    ]
  }
];

const GAMING_CONTROLLER_SPEC_GROUPS = [
  {
    title: 'Ümumi məlumatlar',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-DG-GAF-1106-GM-0013' },
      { key: 'Növ', placeholder: 'məs: Sükan, gamepad, joystick' },
      { key: 'Rəng', placeholder: 'məs: Ağ, qara' },
      { key: 'Uyğunluq', placeholder: 'məs: PS5' },
      { key: 'Düymələrin sayı', placeholder: 'məs: 16' },
      { key: 'Komplektasiya', placeholder: 'məs: Pedallar' },
      { key: 'Xüsusiyyətlər', placeholder: 'məs: Həddindən artıq qızmaya qarşı qoruma' },
      { key: 'Zəmanət', placeholder: 'məs: 12 ay' },
      { key: 'Təyinat', placeholder: 'məs: PlayStation 5' }
    ]
  },
  {
    title: 'Bağlantı və interfeyslər',
    fields: [
      { key: 'Qulaqlıq interfeysi', type: 'boolean' },
      { key: 'İnterfeys', placeholder: 'məs: USB Type-C, Bluetooth' },
      { key: 'Portlar', placeholder: 'məs: 4x USB-A, 1x USB 2.0, 1x USB-C' },
      { key: 'Qoşulma növü', placeholder: 'məs: USB Type-C / Simsiz' },
      { key: 'Naqilin uzunluğu', placeholder: 'məs: 2.8 m' },
      { key: 'Kabel uzunluğu', placeholder: 'məs: 2.1 m' },
      { key: 'Simsiz işləmə məsafəsi', placeholder: 'məs: 10 m / Yox' },
      { key: 'İşləmə radiusu', placeholder: 'məs: 10 m / Yox' }
    ]
  },
  {
    title: 'İdarəetmə imkanları',
    fields: [
      { key: 'Sensorlar', placeholder: 'məs: Hərəkət sensoru' },
      { key: 'Vibrasiya', type: 'boolean' },
      { key: 'Sükanın fırlanma dərəcəsi', placeholder: 'məs: 900°' }
    ]
  }
];

const GAMING_LAPTOP_SPEC_GROUPS = [
  {
    title: 'Ümumi məlumatlar',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-DG-KOT-1114-NB-0001' },
      { key: 'Rəng', placeholder: 'məs: Qara' },
      { key: 'Əməliyyat sistemi', placeholder: 'məs: Windows 11' },
      { key: 'Zəmanət', placeholder: 'məs: 12 ay' },
      { key: 'Model', placeholder: 'məs: ROG Strix G16' },
      { key: 'Kateqoriya', placeholder: 'məs: Oyun üçün' },
      { key: 'Klaviaturanın dili', placeholder: 'məs: İngilis, rus' },
      { key: 'Ölçülər (E × D × H)', placeholder: 'məs: 35.4 × 26.4 × 3.0 sm' }
    ]
  },
  {
    title: 'Ekran və görüntü',
    fields: [
      { key: 'Display', placeholder: 'məs: IPS, 165 Hz' },
      { key: 'Ekranın diaqonalı', placeholder: 'məs: 15.6\"' },
      { key: 'Sensorlu ekran', type: 'boolean' },
      { key: '360 dərəcə fırlanma', type: 'boolean' },
      { key: 'Videokartın növü', placeholder: 'məs: Xarici' },
      { key: 'Videokart', placeholder: 'məs: GeForce RTX 4060' }
    ]
  },
  {
    title: 'Performans və yaddaş',
    fields: [
      { key: 'Prosessor', placeholder: 'məs: Intel Core i7-13650HX' },
      { key: 'Operativ yaddaş', placeholder: 'məs: DDR5 16 GB' },
      { key: 'Daxili yaddaş', placeholder: 'məs: SSD 1 TB' },
      { key: 'Akkumulyatorun tutumu', placeholder: 'məs: 60 Wh' }
    ]
  },
  {
    title: 'Bağlantı və multimedia',
    fields: [
      { key: 'Wi-Fi', placeholder: 'məs: Wi-Fi 6E' },
      { key: 'Veb-kamera', placeholder: 'məs: 720p HD' },
      { key: 'Girişlər', placeholder: 'məs: HDMI, USB-C, USB-A, 3.5 mm' }
    ]
  }
];

const GAMING_ROUTER_SPEC_GROUPS = [
  {
    title: 'Router xüsusiyyətləri',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-DG-ACS-1109-RT-0097' },
      { key: 'Növ', placeholder: 'məs: Geymerlər üçün' },
      { key: 'Wi-Fi', placeholder: 'məs: ax (Wi-Fi 6)' },
      { key: 'Maksimal simsiz əlaqə sürəti', placeholder: 'məs: 1148 Mbit/s' },
      { key: 'IPv6 dəstəyi', type: 'boolean' },
      { key: 'LAN portların sürəti', placeholder: 'məs: 1 Gbit/s' },
      { key: 'LAN portların sayı', placeholder: 'məs: 8' },
      { key: 'Wi-Fi cihazlarının tezlik diapazonu', placeholder: 'məs: 2.4 GHz / 5 GHz (eyni zamanda)' },
      { key: 'Şifrələmə', placeholder: 'məs: WPA, WPA2, WPA3, WPA/WPA2' }
    ]
  }
];

const GAME_DISC_SPEC_GROUPS = [
  {
    title: 'Oyun diski xüsusiyyətləri',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-DG-GAF-1106-GD-0301' },
      { key: 'Brend', placeholder: 'məs: Rockstar Games' },
      { key: 'Uyğunluq', placeholder: 'məs: PlayStation 5' },
      { key: 'Oyun seriyası', placeholder: 'məs: GTA V' },
      { key: 'Oyunçu sayı', placeholder: 'məs: 1' },
      { key: 'Onlayn multiplayer', type: 'boolean' },
      { key: 'Janr', placeholder: 'məs: Macəra' }
    ]
  }
];
