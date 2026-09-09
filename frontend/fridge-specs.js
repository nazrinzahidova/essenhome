// Brend uses Product.brand; existing specification keys are preserved.
const FRIDGE_SPEC_GROUPS = [
  {
    "title": "Əsas xüsusiyyətlər",
    "fields": [
      {
        "key": "Növ",
        "placeholder": "məs: İkikameralı"
      },
      {
        "key": "Toplam faydalı həcm",
        "placeholder": "məs: 205 lt"
      },
      {
        "key": "Soyuducu kameranın faydalı həcmi",
        "placeholder": "məs: 168 lt"
      },
      {
        "key": "Dondurucu kameranın faydalı həcmi",
        "placeholder": "məs: 37 lt"
      },
      {
        "key": "Toplam həcm",
        "placeholder": "məs: 215 lt"
      },
      {
        "key": "Əritmə sistemi",
        "placeholder": "məs: Defrost"
      },
      {
        "key": "Səs səviyyəsi",
        "placeholder": "məs: 42 dB"
      },
      {
        "key": "Enerji istifadə sinfi",
        "placeholder": "məs: A+"
      },
      {
        "key": "Quraşdırılma növü",
        "placeholder": "məs: Solo"
      },
      {
        "key": "Rəng",
        "placeholder": "məs: Ağ"
      },
      {
        "key": "Qapıların sayı",
        "placeholder": "məs: 2"
      },
      {
        "key": "Buz generatoru",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "İdarəetmə növü",
        "placeholder": "məs: Mexaniki"
      },
      {
        "key": "Əlavə xüsusiyyətlər",
        "placeholder": "məs: LED işıqlar"
      },
      {
        "key": "Qapı istiqamətinin dəyişdirilməsi",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Dondurucu kameranın yerləşməsi",
        "placeholder": "məs: Yuxarıda"
      },
      {
        "key": "Hündürlük",
        "placeholder": "məs: 143 sm"
      },
      {
        "key": "En",
        "placeholder": "məs: 55 sm"
      },
      {
        "key": "Dərinlik",
        "placeholder": "məs: 58 sm"
      },
      {
        "key": "Kompressor tipi",
        "placeholder": "məs: Sadə"
      },
      {
        "key": "İqlim sinfi",
        "placeholder": "məs: N, ST"
      },
      {
        "key": "Rəflərin materialı",
        "placeholder": "məs: Şüşə"
      },
      {
        "key": "Təravət bölməsi",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Displey",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Tutacaqların növü",
        "placeholder": "məs: Gizli"
      },
      {
        "key": "Kameraların sayı",
        "placeholder": "məs: 2"
      },
      {
        "key": "Ölçülər (H × E × D)",
        "placeholder": "məs: 143 × 55 × 58 sm"
      },
      {
        "key": "Zəmanət",
        "placeholder": "məs: 36 ay"
      },
      {
        "key": "İstehsalçı ölkə",
        "placeholder": "məs: Çin"
      }
    ]
  }
];
function isFridgeProduct(item) { return String(item.subcategory || item.category || '').trim().toLocaleLowerCase('az') === 'soyuducular'; }
function fridgeSpecEntries(item) {
 const specs=item.specs && typeof item.specs==='object' && !Array.isArray(item.specs) ? item.specs : {};
 return [{key:'Brend'}, ...FRIDGE_SPEC_GROUPS.flatMap(group=>group.fields)].map(field=>{ const value=field.key==='Brend' ? (item.brand || specs.Brend) : specs[field.key]; return [field.label || field.key, value!==null && value!==undefined && String(value).trim() ? value : '-']; });
}
