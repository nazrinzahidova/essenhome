const DISPENSER_SPEC_GROUPS = [
  {
    title: 'Ümumi məlumatlar',
    fields: [
      { key: 'SKU', placeholder: 'məs: TM-DSP-0001' },
      { key: 'Brend', placeholder: 'məs: Beko' },
      { key: 'Növ', options: ['Soyuq su', 'İsti və soyuq su', 'Otaq temperaturunda, isti və soyuq su'] },
      { key: 'Rəng', placeholder: 'məs: Ağ' },
      { key: 'Ölçülər (H × E × D)', placeholder: 'məs: 104 × 31 × 36 sm' },
      { key: 'Əlavə xüsusiyyətlər', placeholder: 'məs: Su damcısı üçün çıxarılan altlıq' },
      { key: 'Quraşdırılma növü', options: ['Döşəməüstü', 'Masaüstü'] },
      { key: 'Naqilin uzunluğu', placeholder: 'məs: 1.5 m' },
      { key: 'Çəki', placeholder: 'məs: 14 kq' },
      { key: 'İstehsalçı ölkə', placeholder: 'məs: Çin' },
      { key: 'Zəmanət', placeholder: 'məs: 12 ay' }
    ]
  },
  {
    title: 'Funksiyalar və soyutma',
    fields: [
      { key: 'Funksiyalar', placeholder: 'məs: İsitmə, soyutma, su paylanması' },
      { key: 'İsitmə gücü', placeholder: 'məs: 550 Vt' },
      { key: 'Soyutma gücü', placeholder: 'məs: 90 Vt' },
      { key: 'Soyutma növü', options: ['Kompresorlu', 'Elektron'] },
      { key: 'Soyutma indikatoru', type: 'boolean' },
      { key: 'İsitmə indikatoru', type: 'boolean' },
      { key: 'Kran sistemi', placeholder: 'məs: 3 kranlı' },
      { key: 'Uşaq kilidi', type: 'boolean' },
      { key: 'Bidonun yerləşdirilməsi', options: ['Yuxarıda', 'Aşağıda'] }
    ]
  }
];
