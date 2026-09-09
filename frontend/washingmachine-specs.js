// Brend uses Product.brand; existing specification keys are preserved.
const WASHING_MACHINE_SPEC_GROUPS = [
  {
    "title": "Əsas xüsusiyyətlər",
    "fields": [
      {
        "key": "İstehsalçı ölkə",
        "placeholder": "məs: Almaniya"
      },
      {
        "key": "Buxarla yuma",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Quraşdırılma növü",
        "placeholder": "məs: Solo"
      },
      {
        "key": "Çamaşırların maksimum yüklənməsi",
        "placeholder": "məs: 9 kq"
      },
      {
        "key": "Qurutma növü",
        "placeholder": "məs: Yox"
      },
      {
        "key": "Çamaşırların qurutma zamanı maksimum yüklənməsi",
        "placeholder": "məs: Yox"
      },
      {
        "key": "Ölçülər (H×E×D)",
        "placeholder": "məs: 84.5 × 59.8 × 58.8 sm",
        "label": "Ölçülər (H × E × D)"
      },
      {
        "key": "Display",
        "placeholder": "məs: Var / Yox",
        "label": "Displey"
      },
      {
        "key": "Enerji istifadə sinfi",
        "placeholder": "məs: A"
      },
      {
        "key": "Proqramların sayı",
        "placeholder": "məs: 9"
      },
      {
        "key": "Yuma sinfi",
        "placeholder": "məs: A"
      },
      {
        "key": "Sıxma sürəti sinfi",
        "placeholder": "məs: B"
      },
      {
        "key": "Maksimal sıxma sürəti",
        "placeholder": "məs: 1400 dövr/dəq"
      },
      {
        "key": "Sıxma sürətinin seçimi",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Rəng",
        "placeholder": "məs: Boz"
      },
      {
        "key": "Xüsusiyyətlər",
        "placeholder": "məs: EcoSilence Drive, SpeedPerfect, AquaStop"
      },
      {
        "key": "Yuma zamanı yükləmə imkanı",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Dərinlik",
        "placeholder": "məs: 58.8 sm"
      },
      {
        "key": "Gecikdirilmiş start",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Qalıq zamanın göstəricisi",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Yuma zamanı səs səviyyəsi",
        "placeholder": "məs: 54 dB"
      },
      {
        "key": "Sıxma zamanı səs səviyyəsi",
        "placeholder": "məs: 72 dB"
      },
      {
        "key": "Hündürlük",
        "placeholder": "məs: 84.5 sm"
      },
      {
        "key": "En",
        "placeholder": "məs: 59.8 sm"
      },
      {
        "key": "Uşaq geyiminin yuyulması proqramı",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Yuma zamanı su sərfiyyatı",
        "placeholder": "məs: 50 lt"
      },
      {
        "key": "Wi-Fi",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Növ",
        "placeholder": "məs: Yuyan"
      },
      {
        "key": "Yükləmə növü",
        "placeholder": "məs: Frontal"
      },
      {
        "key": "Uşaq kilidi",
        "placeholder": "məs: Var / Yox"
      },
      {
        "key": "Mühərrik növü",
        "placeholder": "məs: İnvertor"
      },
      {
        "key": "Zəmanət",
        "placeholder": "məs: 36 ay"
      }
    ]
  }
];
function isWashingMachineProduct(item) { return String(item.subcategory || item.category || '').trim().toLocaleLowerCase('az') === 'paltaryuyan maşınlar'; }
function washingMachineSpecEntries(item) {
 const specs=item.specs && typeof item.specs==='object' && !Array.isArray(item.specs) ? item.specs : {};
 return [{key:'Brend'}, ...WASHING_MACHINE_SPEC_GROUPS.flatMap(group=>group.fields)].map(field=>{ const value=field.key==='Brend' ? (item.brand || specs.Brend) : specs[field.key]; return [field.label || field.key, value!==null && value!==undefined && String(value).trim() ? value : '-']; });
}
