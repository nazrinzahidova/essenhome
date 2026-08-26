// ============== SOYUDUCU XÜSUSİYYƏTLƏRİ ==============

const FRIDGE_SPEC_GROUPS = [
  {
    title: 'Əsas xüsusiyyətlər',
    fields: [
      {
        key: 'SKU',
        label: 'SKU',
        placeholder: 'Məsələn: TM-MT-BMT-1108-RB-0307'
      },
      {
        key: 'Növ',
        label: 'Növ',
        options: [
          'Birkameralı',
          'İkikameralı',
          'Side by Side',
          'French Door',
          'Mini soyuducu',
          'Vitrin soyuducu'
        ]
      },
      {
        key: 'Hündürlük',
        label: 'Hündürlük',
        placeholder: 'Məsələn: 186 sm'
      },
      {
        key: 'İdarəetmə növü',
        label: 'İdarəetmə növü',
        options: [
          'Mexaniki',
          'Elektron',
          'Sensor'
        ]
      },
      {
        key: 'Displey',
        label: 'Displey',
        type: 'boolean'
      },
      {
        key: 'Rəng',
        label: 'Rəng',
        placeholder: 'Məsələn: Gümüşü'
      }
    ]
  },

  {
    title: 'Ölçülər və həcm',
    fields: [
      {
        key: 'Ölçülər (H × E × D)',
        label: 'Ölçülər (H × E × D)',
        placeholder: 'Məsələn: 186 × 86 × 81 sm'
      },
      {
        key: 'En',
        label: 'En',
        placeholder: 'Məsələn: 86 sm'
      },
      {
        key: 'Dərinlik',
        label: 'Dərinlik',
        placeholder: 'Məsələn: 81 sm'
      },
      {
        key: 'Toplam həcm',
        label: 'Toplam həcm',
        placeholder: 'Məsələn: 682 lt'
      },
      {
        key: 'Toplam faydalı həcm',
        label: 'Toplam faydalı həcm',
        placeholder: 'Məsələn: 619 lt'
      },
      {
        key: 'Soyuducu kameranın faydalı həcmi',
        label: 'Soyuducu kameranın faydalı həcmi',
        placeholder: 'Məsələn: 496 lt'
      },
      {
        key: 'Dondurucu kameranın faydalı həcmi',
        label: 'Dondurucu kameranın faydalı həcmi',
        placeholder: 'Məsələn: 186 lt'
      }
    ]
  },

  {
    title: 'Soyutma sistemi',
    fields: [
      {
        key: 'Əritmə sistemi',
        label: 'Əritmə sistemi',
        options: [
          'No Frost',
          'Total No Frost',
          'Full No Frost',
          'Low Frost',
          'Defrost',
          'Statik'
        ]
      },
      {
        key: 'Kompressor tipi',
        label: 'Kompressor tipi',
        options: [
          'Sadə',
          'İnverter',
          'Digital Inverter',
          'Linear Inverter'
        ]
      },
      {
        key: 'Enerji istifadə sinfi',
        label: 'Enerji istifadə sinfi',
        options: [
          'A+++',
          'A++',
          'A+',
          'A',
          'B',
          'C',
          'D',
          'E',
          'F',
          'G'
        ]
      },
      {
        key: 'Səs səviyyəsi',
        label: 'Səs səviyyəsi',
        placeholder: 'Məsələn: 40 dB'
      },
      {
        key: 'İqlim sinfi',
        label: 'İqlim sinfi',
        placeholder: 'Məsələn: SN, N, ST, T'
      }
    ]
  },

  {
    title: 'Kamera və qapılar',
    fields: [
      {
        key: 'Kameraların sayı',
        label: 'Kameraların sayı',
        placeholder: 'Məsələn: 2'
      },
      {
        key: 'Qapıların sayı',
        label: 'Qapıların sayı',
        placeholder: 'Məsələn: 2'
      },
      {
        key: 'Qapı istiqamətinin dəyişdirilməsi',
        label: 'Qapı istiqamətinin dəyişdirilməsi',
        type: 'boolean'
      },
      {
        key: 'Dondurucu kameranın yerləşməsi',
        label: 'Dondurucu kameranın yerləşməsi',
        options: [
          'Yuxarıda',
          'Aşağıda',
          'Yanda',
          'Yoxdur'
        ]
      },
      {
        key: 'Buz generatoru',
        label: 'Buz generatoru',
        type: 'boolean'
      },
      {
        key: 'Təravət bölməsi',
        label: 'Təravət bölməsi',
        type: 'boolean'
      }
    ]
  },

  {
    title: 'Material və quruluş',
    fields: [
      {
        key: 'Rəflərin materialı',
        label: 'Rəflərin materialı',
        options: [
          'Şüşə',
          'Plastik',
          'Metal'
        ]
      },
      {
        key: 'Tutacaqların növü',
        label: 'Tutacaqların növü',
        options: [
          'Gizli',
          'Xarici',
          'İnteqrasiya edilmiş'
        ]
      },
      {
        key: 'Quraşdırılma növü',
        label: 'Quraşdırılma növü',
        options: [
          'Solo',
          'Ankastre'
        ]
      }
    ]
  },

  {
    title: 'Əlavə məlumatlar',
    fields: [
      {
        key: 'Əlavə xüsusiyyətlər',
        label: 'Əlavə xüsusiyyətlər',
        placeholder: 'Məsələn: Temperatur displeyi, super dondurma, qapı açıq siqnalı'
      },
      {
        key: 'İstehsalçı ölkə',
        label: 'İstehsalçı ölkə',
        placeholder: 'Məsələn: Türkiyə'
      },
      {
        key: 'Zəmanət',
        label: 'Zəmanət',
        placeholder: 'Məsələn: 36 ay'
      }
    ]
  }
];