// ============== ADMIN KATEQORİYALARI ==============
// Bu fayl yalnız admin panel tərəfindən istifadə olunur.
// Buradakı dəyişikliklər sidebar və kataloqa təsir etmir.
//
// Yeni alt-kateqoriya nümunəsi:
// "Gamer zona": [
//   {
//     group: "Məhsul növləri",
//     items: ["Oyun monitoru", "Oyun notbuku", "Oyun routeri"]
//   }
// ],

const ADMIN_CATEGORY_TREE = {
  "Yay sərinliyi": [
  {
    group: "Yay sərinliyi",
    items: [
      "Kondisionerlər",
      "Ventilyatorlar",
      "Uşaq üçün hava nəmləndiriciləri",
    ]
  },
  {
    group: "Hava təmizləyicilər və nəmləndiricilər",
    items: [
      "Hava nəmləndirici",
      "Hava təmizləyici",
      "Hava təravətləndirici",
      "İqlim kompleksi"
    ]
  }
],
  "Gamer zona": [
  {
    group: "Gamer zona",
    items: [
      "Gaming TV",
      "Oyun smartfonları",
      "Oyun konsolları",
      "Oyun monitorları",
      "Oyun notbukları",
      "Oyun routerləri"
    ]
  },
  {
    group: "Videooyun avadanlıqları",
    items: [
      "Konsol",
      "Oyun manipulyatorları",
      "Oyun diskləri"
    ]
  },
  {
    group: "PlayStation",
    items: [
      "PlayStation 5",
      "PlayStation 5 oyunları",
      "PlayStation 4 oyunları",
      "PlayStation qulaqlıqları",
      "PlayStation manipulyatorları"
    ]
  }
],
  "Coffee": [{
      group: "Cofee",
      items: ["Qəhvəbişirənlər","Kapsullu qəhvəbişirənlər","Qəhvədəmləyən espresso","Damcılı qəhvəbişirənlər","Turka","Qəhvəüyüdənlər","Süd köpükləndiricilər","Qəhvə","Qəhvəbişirən üçün kapsul","Qəhvə üçün fincanlar","Qəhvə üçün stəkanlar",]
    }],
  "Apple": [{
      group: "Apple",
      items: ["Apple smartfonları","Apple qulaqlıqları","Apple planşetləri","Apple qoruyucu örtükləri","Apple smart saatları","Apple notbukları",]
    }],
  "Smartfonlar və aksesuarlar": [
  {
    group: "Smartfonlar və aksesuarlar",
    items: [
      "Smartfonlar",
      "Planşetlər",
      "Planşet aksesuarları",
      "Portativ akustika",
      "Ev və ofis telefonları",
      "Apple notbukları",
      "Düyməli telefonlar"
    ]
  },
  {
    group: "Qulaqlıqlar",
    items: [
      "Bluetooth simsiz qulaqlıqlar",
      "TWS simsiz qulaqlıqlar",
      "Simli qulaqlıqlar",
      "Oyun qulaqlıqları",
      "Studiya qulaqlıqları",
      "Qulaqlıq aksesuarları"
    ]
  },
  {
    group: "Telefon aksesuarları",
    items: [
      "Simsiz enerji toplama cihazı",
      "MagSafe aksesuarları",
      "Fotostabilizatorlar",
      "Qoruyucu örtük",
      "USB naqillər",
      "Powerbank",
      "Selfie çubuqlar",
      "SD kartlar",
      "Telefon üçün tutacaqlar",
      "Açarlıq",
      "Digər aksesuarlar",
    ]
  }, 
  
],
  "Smart qadcetlər": [{
      group: "Smart qadcetlər",
      items: ["Smart saatlar","Smart eynəklər","Smart qolbaqlar","Smart akustika","Smart saat kəmərləri","Qol saatları",]
    },
    {
    group: "Smart avadanlıqlar",
    items: [
      "Sensorlar",
      "İşıqlandlrma",
      "IP videomüşahidə kameraları",
      "Smart kilidlər",
      "Domofonlar",
    ]
  },
],
  "Notbuklar, PK, planşetlər": [{
      group: "Notbuklar, PK, planşetlər",
      items: ["Notbuklar","Monitorlar","Planşetlər",]
    },
    {
      group: "Kompüterlər",
      items: ["Sistem blokları","Monobloklar",]
    },
    {
      group: "Kompüter hissələri",
      items: ["Ana plata","Operativ yaddaş",]
    },
    {
      group: "Notbuk çantaları",
      items: ["Bel çantaları","Çantalar",]
    },
    {
      group: "Periferiya avadanlığı",
      items: ["Klaviaturalar","Mikrofonlar","Mouse","Oyun klaviaturaları","Oyun qulaqlıqları","Oyun üçün mouse",]
    },
    {
      group: "Ofis avadanlığı",
      items: ["Printerlər və çfq","İstehlak məhsulları"]
    },
    {
      group: "Kompüter aksesuarları",
      items: ["Fleş kartlar","SSD və HDD kartlar","Mousepad","Kompüter adapterləri","Oyun kresloları","Soyutma altlıqları","Ötürücülər","Şəbəkə uzadıcıları",]
    },
    {
      group: "Şəbəkə avadanlığı",
      items: ["Routerlər","Wi-Fi gücləndiricilər","Wi-Fi adapterlər"]
    },
  ],
  "TV, audio və foto": [{
      group: "TV, audio və foto",
      items: ["TV brend üzrə","İnteraktiv panellər"]
    },
    {
      group: "Audio texnika",
      items: ["Soundbar","Musiqi mərkəzləri","Portativ akustika","Smart akustika","Vinil oxuyucu aksesuarları","Blogger mikrofonları",]
    },
    {
      group: "Kamera və fotoaparatlar",
      items: ["Ani çap fotoaparatları","Ekşn kameralar","Fotoaparatlar",]
    },
    {
      group: "Televizor aksesuarları",
      items: ["Smart box","HDMI naqillər","Ötürücülər","Kronşteynlər","Şəbəkə uzadıcıları","TV altlığı","Batareyalar",]
    },
    {
      group: "Linzalar,fleşlər,aksesuarlar",
      items: ["Obyektivlər,ştativlər və çantalar","Fotostabilizatorlar",]
    },
    {
      group: "Proyeksiya avadanlığı",
      items: ["Proyektorlar",]
    },
    {
      group: "Televizor aksesuarları",
      items: ["Smart box","HDMI naqillər","Ötürücülər","Kronşteynlər","Şəbəkə uzadıcıları","TV altlığı","Batareyalar",]
    },
  ],
  "Ev texnikası": [{
      group: "Ev üçün böyük texnika",
      items: ["Paltaryuyan maşınlar","Quruducu maşınlar",]
    },
    
    {
      group: "Ev üçün kiçik texnika",
      items: ["Tozsoranlar","Robot tozsoranlar","Vertikal tozsoranlar","Yuyucu tozsoranlar","Buxarlı təmizləyicilər","Tiftik təmizləyən","Ütülər","Ütü masaları","Paltar üçün quruducu","Buxarlı generatorlar","Şaquli buxarlı ütülər","Tikiş maşınları","Robot pəncərə təmizləyənlər",]
    },
    {
      group: "Ev texnikası üçün məhsullar",
      items: ["Tozsoran üçün başlıq","Tozsoran üçün filtr","Buxarlı təmizləyici üçün başlıq","Tozsoran üçün torba","Ütü üçün aksesuarlar",]
    },
    {
      group: "İqlim aksesuarları",
      items: ["Seksiyalı radiatorlar","Panel radiatorlar","İsti döşəmə","Hava təmizləyicisi filtri",]
    },
  ],
  "Mətbəx texnikası": [{
      group: "Mətbəx üçün böyük texnika",
      items: ["Soyuducular","Dondurucular","Paltaryuyan maşınlar","Aspiratorlar","Solo sobalar","Qabyuyan maşınlar","Şərab soyuducuları","İçkisoyuducuları","Dispenserlər","Tibbi soyuducular",]
    },
    {
      group: "Mətbəx üçün kiçik texnika",
      items: ["Mikrodalğalı sobalar","Stasionar blenderlər","Mini sobalar","Əl blenderləri","Ətçəkən maşınlar","Mikserlər","İzqara","Multibişiricilər","Tosterlər","Mini sobalar","Fritoz","Mətbəx tərəziləri","Sendviç və vafli hazırlayan","Doğrayıcı","Meyvə və tərəvəz qurudan","Mətbəx kombaynları","İnduksiya plitələri",]
    },
    {
      group: "İçki hazırlanması",
      items: ["Elektrikli çaydanlar","İnduksion çaydanlar","Stasionar blenderlər","Sitrus press","Dəm çaydanları və French Press-lər","Şirəçəkənlər","Termopotlar",]
    },
    {
      group: "Quraşdırılan texnika",
      items: ["Quraşdırılan sobalar","Quraşdırılan plitələr","Quraşdırılan soyuducular","Quraşdırılan qabyuyan maşınlar","Quraşdırılan paltaryuyan maşınlar","Quraşdırılan mikrodalğalı sobalar","Quraşdırılan qəhvəbişirənlər","Qida tullantıları üçün üyüdücülər",]
    },
  ],
  "Qab-qacaq": [{
      group: "Yemək üçün qab-qacaq",
      items: ["Qazan dəsti","Qazanlar","İnduksion çaydanlar","Tavalar","Dəm çaydanları və French Press-lər","Qapaqlar","Bişirmə üçün formalar",]
    },
    {
      group: "Süfrə üçün qab-qacaq",
      items: ["Serviz dəstləri","Boşqablar","Fincanlar və stəkanlar","Güldanlar","Kasa və çərəz qabları","Çəngəl-bıçaq dəsti","Sinilər",]
    },
    {
      group: "Mətbəx ləvazimatları",
      items: ["Termoslar","Mətbəx ləvazimatları","Saxlama qabları","Bıçaqlar","Şüşə məhsullar",]
    },
  ],
  "Şəxsi baxım texnikası": [
    {
      group: "Şəxsi baxım texnikası",
      items: ["Premium brendlər","Yeniliklər",]
    },
    {
      group: "Dyson",
      items: ["Dyson multistayler","Dyson fen ütülər","Dyson hava fenləri","Dyson saç aksesuaları və daraqlar",]
    },
    {
      group: "Saç düzümü",
      items: ["Hava fenləri","Fen daraqlar","Fen maşalar","Fen ütülər","Multistaylerlər","Saçlara qulluq aksesuarları",]
    },
    {
      group: "Təraş və saç məhsulları",
      items: ["Üz qırxanlar","Saç qırxanlar","Trimmerlər",]
    },
    {
      group: "Sağlamlıq məhsulları",
      items: ["Elektrik diş fırçaları","İrriqatorlar","Masajorlar","Termometrlər",]
    },
  ],
  "Mebel və tekstil": [
    {
      group: "Yataq otağı",
      items: ["Yataq otağı dəstləri","Yataq otağı dolabları","Çarpayılar","Trümolar","Tumbalar","Boy aynaları",]
    },
    {
      group: "Qonaq otağı",
      items: ["Qonaq otağı dəstləri","Divan və kreslo","Masalar","Kamodlar","Jurnal masaları","Vitrinlər","Kitab rəfi","Oturacaqlar","TV altlığı","Puflar",]
    },
    {
      group: "Mətbəx mebeli",
      items: ["Yataq otağı dəstləri","Yataq otağı dolabları","Çarpayılar","Trümolar","Tumbalar","Boy aynaları",]
    },
  ],
  "Nəqliyyat": [],
  "İdman və əyləncə": [],
  "Uşaq aləmi": [],
  "Ev heyvanları üçün məhsullar": [],
  "Təmir tikinti": [],
  "Ev və bağ": [],
};

const ADMIN_CATEGORY_LIST = Object.keys(ADMIN_CATEGORY_TREE);
