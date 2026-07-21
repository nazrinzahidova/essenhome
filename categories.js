// ============== KATEQORİYA AĞACI ==============
// Struktur: { "Əsas kateqoriya": [ { group: "Qrup adı", items: ["Alt-kateqoriya", ...] }, ... ] }
// "group" sadəcə select içində optgroup başlığıdır (şəkillərdəki sütun başlıqlarına uyğundur)

const CATEGORY_TREE = {
  "Yay sərinliyi": [
    { group: "Kondisionerin brendi", items: ["HOFFMANN","LG","Hisense","Gree","TCL","Bosch","Samsung","Beko","Mitsubishi","Electrolux","Sharp","Panasonic","AUX","Midea","Ardesto"] },
    { group: "Tövsiyə olunan otaq sahəsi", items: ["25-45 m²","45-100 m²","100-180 m²"] },
    { group: "Kondisionerin növü", items: ["Split sistemləri","Daxili bloklar","Xarici bloklar","Kolon tiplilər"] },
    { group: "Ventilyatorlar", items: ["Döşəməüstü","Masaüstü","Qüllə","Universal"] },
    { group: "Uşaq üçün hava nəmləndiriciləri", items: [] },
    { group: "Hava təmizləyicilər və nəmləndiricilər", items: ["Hava nəmləndirici","Hava təmizləyici","Hava tərəvətləndirici","İqlim kompleksi (Hava təmizləyici və nəmləndirici)"] }
  ],

  "Gamer zona": [
    { group: "Gaming TV", items: [] },
    { group: "Oyun smartfonları", items: [] },
    { group: "Oyun konsolları", items: ["Nintendo","Anbernic","Microsoft","Miyoo","Lenovo","Ayaneo"] },
    { group: "Oyun routerləri", items: [] },
    { group: "Oyun monitorları", items: ["Porodo","LG","Xiaomi","2E"] },
    { group: "Oyun periferiyası", items: ["Oyun klaviaturaları","Oyun üçün Mouse","Oyun üçün Mouse Pad","Oyun kresloları","Oyun qulaqlıqları","Geymerlər üçün router","Mikrofonlar","Soyutma altlıqları"] },
    { group: "Videooyun avadanlıqları", items: ["Konsol","Oyun manipulyatorları","Oyun diskləri"] },
    { group: "Oyun notbukları", items: ["Asus","Acer","MSI","HP","Lenovo"] },
    { group: "PlayStation", items: ["PlayStation 5","PlayStation 5 oyunları","PlayStation 4 oyunları","PlayStation qulaqlıqları","PlayStation manipulyatorları"] },
    { group: "Kompüter hissələri", items: ["Ana plata","Operativ yaddaş","Sistem blokları"] }
  ],

  "First Coffee": [
    { group: "Qəhvə texnikası", items: ["Qəhvəbişirənlər","Kapsullu qəhvəbişirənlər","Qəhvədəmləyən espresso","Damcılı qəhvəbişirənlər","Turka","Qəhvəüyüdənlər","Süd köpükləndiricilər"] },
    { group: "Qəhvə hazırlanması", items: ["Qəhvə","Qəhvəbişirən üçün kapsul"] },
    { group: "Qəhvə üçün qab-qacaq", items: ["Qəhvə üçün fincanlar","Qəhvə üçün stəkanlar"] }
  ],

  "Apple": [
    { group: "Apple smartfonları", items: ["iPhone 17 Pro Max","iPhone 17 Pro","iPhone 17e","iPhone 16","iPhone 15","iPhone Air"] },
    { group: "Apple qulaqlıqları", items: ["AirPods","AirPods Max 2"] },
    { group: "Apple smart saatları", items: ["Apple Watch Series 11","Apple Watch Ultra 3","Apple Watch SE 3"] },
    { group: "Apple planşetləri", items: ["iPad 10.9-inch","iPad 11-inch"] },
    { group: "Apple notbukları", items: ["MacBook Neo","MacBook Air","MacBook Pro"] },
    { group: "Apple qoruyucu örtükləri", items: ["iPhone 15 seriyası","iPhone 16 seriyası","iPhone 17 seriyası","iPhone Air"] }
  ],

  "Smartfonlar və aksesuarlar": [
    { group: "Smartfonlar", items: ["Apple","Samsung","OPPO","Xiaomi","Realme","HONOR","Vertu","Oscal","Cubot","Infinix","Motorola"] },
    { group: "Planşetlər", items: ["Apple","Samsung","Xiaomi","HUAWEI","OPPO","HONOR"] },
    { group: "Planşet aksesuarları", items: [] },
    { group: "Portativ akustika", items: [] },
    { group: "Ev və ofis telefonları", items: [] },
    { group: "Qulaqlıqlar", items: ["Bluetooth simsiz qulaqlıqlar","TWS simsiz qulaqlıqlar","Simli qulaqlıqlar","Oyun qulaqlıqları","Studiya qulaqlıqları","Qulaqlıq aksesuarları"] },
    { group: "Düyməli telefonlar", items: ["Nokia","Panasonic"] },
    { group: "Telefon aksesuarları", items: ["Simsiz enerji toplama cihazı","MagSafe aksesuarları","Fotostabilizatorlar","Qoruyucu örtük","USB naqillər","Powerbank","Telefon adapterləri","Selfie çubuqlar","SD kartlar","Telefon üçün tutacaqlar","Açarlıq","Digər aksesuarlar"] }
  ],

  "Smart qadcetlər": [
    { group: "Smart saatlar", items: ["Apple","HUAWEI","Xiaomi","Samsung","Kieslect","Vertu"] },
    { group: "Smart akustika", items: ["Yandex","Loewe"] },
    { group: "Smart eynəklər", items: [] },
    { group: "Qulaqlıqlar", items: ["Bluetooth simsiz qulaqlıqlar","TWS simsiz qulaqlıqlar","Simli qulaqlıqlar","Studiya qulaqlıqları","Oyun qulaqlıqları"] },
    { group: "Qulaqlıq aksesuarları", items: ["Qoruyucu örtük"] },
    { group: "Smart qolbaqlar", items: ["HUAWEI","Xiaomi"] },
    { group: "Smart saat kəmərləri", items: ["Apple","Xiaomi"] },
    { group: "Smart avadanlıqlar", items: ["Sensorlar","İşıqlandırma","IP videomüşahidə kameraları","Smart kilidlər","Domofonlar"] },
    { group: "Qol saatlar", items: ["Edifice","Orient","Daniel Klein","Santa Barbara Polo Racquet Club","Swiss Military by Chrono","Ingersoll","CURREN"] }
  ],

  "Notbuklar, PK, planşetlər": [
    { group: "Notbuklar", items: ["Apple","Asus","Acer","Dell","HP","HUAWEI","Lenovo"] },
    { group: "Notbuk çantaları", items: ["Bel çantaları","Çantalar","Çexollar","Kisə bel çantası","Mini bel çantası"] },
    { group: "Planşet aksesuarları", items: ["Qoruyucu örtük","Stilus"] },
    { group: "Kompüterlər", items: ["Sistem blokları","Monobloklar"] },
    { group: "Pereferiya avadanlığı", items: ["Klaviaturalar","Mikrofonlar","Mouse","Oyun klaviaturaları","Oyun qulaqlıqları","Oyun üçün Mouse"] },
    { group: "Şəbəkə avadanlığı", items: ["Routerlər","Wi-Fi gücləndiricilər","Wi-Fi adapterlər"] },
    { group: "Monitorlar", items: ["Asus","Dahua","Philips","LG","2E","ViewSonic","Dizayn monitorları","Oyun monitorları"] },
    { group: "Ofis avadanlığı", items: ["Printerlər və cfq","İstehlak məhsulları"] },
    { group: "Videooyun avadanlıqları", items: ["Konsol","Oyun manipulyatorları","Oyun diskləri"] },
    { group: "Kompüter hissələri", items: ["Ana plata","Operativ yaddaş"] },
    { group: "Kompüter aksesuarları", items: ["Fleş kartlar","SSD və HDD kartlar","Mousepad","Kompüter adapterləri","Oyun kresloları","Soyutma altlıqları","Ötürücülər","Şəbəkə uzadıcıları"] },
    { group: "Planşetlər", items: ["HONOR","Lenovo","Oukitel","HUAWEI"] }
  ],

  "TV, audio və foto": [
    { group: "TV brend üzrə", items: ["Hisense","Toshiba","Xiaomi","LG","Samsung","HOFFMANN"] },
    { group: "Ekran tezliyi", items: ["120 Hz","144 Hz","165 Hz"] },
    { group: "TV texnologiyası", items: ["OLED","QLED","Mini-LED","RGB"] },
    { group: "Audio texnika", items: ["Soundbar","Musiqi mərkəzləri","Portativ akustika","Smart akustika","Vinil oxuyucu aksesuarları","Blogger mikrofonları"] },
    { group: "TV diaqonal üzrə", items: ["20\"-32\" (51-81sm)","40\"-43\" (101-109sm)","47\"-50\" (119-127sm)","55\"-60\" (140-152sm)","65\"-70\" (165-178sm)","75\"-100\" (190-254sm)","98\"-120\" (248-304sm)"] },
    { group: "Gaming TV", items: [] },
    { group: "İnteraktiv panellər", items: [] },
    { group: "Linzalar, fleşlər, aksesuarlar", items: ["Obyektivlər, ştativlər və çantalar","Fotostabilizatorlar"] },
    { group: "Proyeksiya avadanlığı", items: ["Proyektorlar"] },
    { group: "Kamera və fotoaparatlar", items: ["Ani çap fotoaparatları","Ekşn kameralar","Fotoaparatlar"] },
    { group: "Televizor aksesuarları", items: ["Smart box","HDMI naqillər","Ötürücülər","Kronşteynlər","Şəbəkə uzadıcıları","TV altlığı","Batareyalar"] }
  ],

  "Ev texnikası": [
    { group: "Ev üçün böyük texnika", items: ["Paltaryuyan maşınlar","Quruducu maşınlar"] },
    { group: "İqlim texnikası", items: ["Kondisionerlər","Ventilyatorlar","Kombi sistemləri","Hava təmizləyicilər və nəmləndiricilər","Qaz kolonkaları","Elektrikli su qızdırıcıları","Qızdırıcı ventilyatorlar"] },
    { group: "Ev üçün kiçik texnika", items: ["Tozsoranlar","Robot tozsoranlar","Vertikal tozsoranlar","Yuyucu tozsoranlar","Tiftik təmizləyən","Ütülər","Buxarlı generatorlar","Şaquli buxarlı ütülər","Buxarlı təmizləyicilər","Tikiş maşınları","Robot pəncərə təmizləyənlər"] },
    { group: "Məişət məhsulları", items: ["Paltar üçün quruducu","Ütü masaları"] },
    { group: "İqlim aksesuarları", items: ["Seksiyalı radiatorlar","Panel radiatorlar","İsti döşəmə","Hava təmizləyicisi filtri"] },
    { group: "Geyimə qulluq", items: ["Paltar üçün quruducu","Ütü masaları","Tiftik təmizləyən","Ütülər","Buxarlı təmizləyicilər","Şaquli buxarlı ütülər","Buxarlı generatorlar","Tikiş maşınları"] },
    { group: "Ev texnikası üçün məhsullar", items: ["Tozsoran üçün başlıq","Tozsoran üçün filtr","Buxarlı təmizləyici üçün başlıq","Tozsoran üçün torba","Ütü üçün aksesuarlar"] }
  ],

  "Mətbəx texnikası": [
    { group: "Böyük texnika", items: ["Soyuducular","Dondurucular","Paltaryuyan maşınlar","Aspiratorlar","Solo sobalar","Qabyuyan maşınlar","Şərab soyuducuları","İçki soyuducuları","Dispenserlər","Tibbi soyuducular"] },
    { group: "Yemək hazırlanması", items: ["Mikrodalğalı sobalar","Stasionar blenderlər","Mini sobalar","Əl blenderləri","Ətçəkən maşınlar","Mikserlər","İzqara","Multibişiricilər","Tosterlər","Fritoz","Mətbəx tərəziləri","Sendviç və vafli hazırlayan","Doğrayıcı","Meyvə və tərəvəz qurudan","Mətbəx kombaynları","İnduksiya plitələri"] },
    { group: "İçki hazırlanması", items: ["Elektrikli çaydanlar","İnduksion çaydanlar","Stasionar blenderlər","Sitrus press","Dəm çaydanları və French Press-lər","Şirəçəkənlər","Termopotlar"] },
    { group: "Qəhvə hazırlanması", items: ["Qəhvəbişirənlər","Kapsullu qəhvəbişirənlər","Damcılı qəhvəbişirənlər","Turka","Qəhvəüyüdənlər","Qəhvə","Qəhvəbişirən üçün kapsul"] },
    { group: "Quraşdırılan texnika", items: ["Quraşdırılan sobalar","Quraşdırılan plitələr","Aspiratorlar","Quraşdırılan soyuducular","Quraşdırılan qabyuyan maşınlar","Quraşdırılan paltaryuyan maşınlar","Quraşdırılan mikrodalğalı sobalar","Quraşdırılan qəhvəbişirənlər","Qida tullantıları üçün üyüdücülər"] },
    { group: "Mətbəx texnikası aksesuarları", items: [] }
  ],

  "Qab-qacaq": [
    { group: "Yemək hazırlanması üçün qab-qacaq", items: ["Qazan dəsti","Qazanlar","İnduksion çaydanlar","Tavalar","Dəm çaydanları və French Press-lər","Qapaqlar","Bişirmə üçün formalar"] },
    { group: "Süfrə qab-qacağı", items: ["Serviz dəstləri","Boşqablar","Fincanlar və stəkanlar","Güldanlar","Kasa və çərəz qabları","Çəngəl-bıçaq dəsti","Sinilər"] },
    { group: "Mətbəx üçün ləvazimatlar", items: ["Termoslar","Mətbəx ləvazimatları","Saxlama qabları","Bıçaqlar","Şüşə məhsullar"] }
  ],

  "Gözəllik və sağlamlıq texnikası": [
    { group: "Dyson", items: ["Dyson multistayler","Dyson fen ütülər","Dyson hava fenləri","Dyson saç aksesuarları və daraqlar"] },
    { group: "Ətriyyat", items: ["Qadın ətirləri","Kişi ətirləri","Uniseks ətirləri","Ətir dəstləri"] },
    { group: "Saç düzümü", items: ["Hava fenləri","Fen daraqlar","Fen maşalar","Fen ütülər","Multistaylerlər","Saçlara qulluq aksesuarları"] },
    { group: "Kosmetika və baxım", items: ["Dekorativ kosmetika","Uşaq üçün sağlamlıq, qulluq, gigiyena","Ətriyyat"] },
    { group: "Təraş və saç kəsilməsi", items: ["Üzqırxanlar","Saçqırxanlar","Trimmerlər"] },
    { group: "Baxım cihazları", items: ["Epilyatorlar","Fotoepilyatorlar"] },
    { group: "Yeniliklər", items: [] },
    { group: "Premium brendlər", items: ["BORK","Dyson","Dreame"] },
    { group: "Sağlamlıq", items: ["Elektrik diş fırçaları","İrriqatorlar","Masajorlar","Termometrlər"] }
  ],

  "Mebel və tekstil": [
    { group: "Yataq otağı", items: ["Yataq otağı dəstləri","Yataq otağı dolabları","Çarpayılar","Trümolar","Tumbalar","Boy aynaları"] },
    { group: "Mebel sifarişlə", items: ["Mətbəx mebel dəstləri sifarişlə","Qonaq otağı sifarişlə","Yataq otağı sifarişlə","Gənc otağı sifarişlə","Dolablar sifarişlə"] },
    { group: "Qonaq otağı", items: ["Qonaq otağı dəstləri","Divan və kreslo","Masalar","Kamodlar","Jurnal masaları","Vitrinlər","Kitab rəfi","Oturacaqlar","TV altlığı","Puflar"] },
    { group: "Tekstil", items: ["Matraslar","Yataq dəstləri","Pikeli yataq dəstləri","Adyallar","Yorğanlar","Yastıqlar","Çarpayı örtükləri","Dəsmallar","Süfrələr","Mətbəx tekstili","Xalçalar"] },
    { group: "Mətbəx mebeli", items: ["Alman mətbəxləri","Mətbəx mebel dəstləri sifarişlə","Mətbəx masaları","Mətbəx oturacaqları"] },
    { group: "Oturacaqlar", items: ["Mətbəx oturacaqları","Qonaq otağı oturacaqları"] },
    { group: "Bağ mebelləri", items: [] },
    { group: "Gənc otağı", items: ["Gənc otağı dəstləri","Beşiklər və uşaq çarpayıları","Çalışma masaları","Gənc çarpayıları","Dolablar","Tumbalar"] },
    { group: "Ofis mebeli", items: ["Kürsülər","Ofis üçün masa","Ofis üçün dolab"] },
    { group: "Yumşaq mebellər", items: ["Divan və kreslolar","Künc divanlar","Üç yerli divanlar","Kreslolar","Puflar"] },
    { group: "Dəhliz mebelləri", items: ["Dəhliz dolabları","Sürgülü dolablar","Ayaqqabı rəfləri"] },
    { group: "Matraslar", items: ["Askona","Graft","Komfy","Ormatek","Royal","Ortopedik matraslar","Yarı ortopedik matraslar"] }
  ],

  "Nəqliyyat": [
    { group: "Nəqliyyat", items: ["Velosipedlər","Velosiped aksesuarları","Mopedlər","Uşaq üçün skuterlər","Kvadrosikl"] },
    { group: "Texniki dəstək", items: [] },
    { group: "Qulluq vasitələri", items: ["Qulluq və təmizlik vasitələri"] },
    { group: "Elektronəqliyyat", items: ["Elektrosamokatlar","Elektroskeytlər"] },
    { group: "Ehtiyat hissələri", items: ["Akkumulyatorlar","İşıqlandırma avadanlıqları"] },
    { group: "Avtomobil aksesuarları", items: ["Sükan örtükləri","Avtomobil ayaqaltıları","Telefon tutacaqları"] },
    { group: "Yağlar və mayelər", items: ["Mühərrik yağları","Hidravlik yağlar","Sürət qutusu yağları","Antifrizlər","Əyləc mayeləri"] },
    { group: "Termo çanta", items: [] },
    { group: "Avtoelektronika", items: ["Video qeydiyyatçılar","Avtomobil monitorları","Maqnitofonlar","Avtomobil üçün dinamiklər","Gücləndiricilər","Subwoofer","Enerji toplama cihazları","Avtomobil üçün şarj stansiyası"] },
    { group: "Təkərlər", items: ["Avtomobil təkərləri","Motosikl təkərləri"] },
    { group: "Yüksək təzyiqli yuyucular", items: ["Fieldmann","Karcher","Keman","P.I.T.","Pamer","Stihl","WOKIN","Total"] }
  ],

  "İdman və əyləncə": [
    { group: "Geymerlər üçün məhsullar", items: ["Oyun periferiyası","Oyun smartfonları","Oyun monitorları","Videooyunlar"] },
    { group: "Musiqi alətləri", items: ["Gitaralar","Gitara aksesuarları","Gitara gücləndiriciləri","MIDI-kontrollerlər","Skripkalar","Nəfəs alətləri","Pianolar","Audio interfeysləri","Sintezatorlar","Musiqi alət aksesuarları","Zərb alətləri","Dinamiklər","İşıqlandırma avadanlığı"] },
    { group: "Kitablar", items: [] },
    { group: "Studiya aksesuarları", items: ["Studiya monitorları","Studiya qulaqlıqları"] },
    { group: "LEGO", items: [] },
    { group: "Kolleksiya fiqurları", items: [] },
    { group: "Nintendo", items: [] },
    { group: "Oyunlar", items: ["Pazllar","Masaüstü oyunlar","İdman oyunları"] },
    { group: "PlayStation", items: [] },
    { group: "İdman məhsulları", items: ["Universal trenajorlar","Velotrenajorlar","Qaçış trenajorları","Jim skamyası","Fitnes üçün avadanlıq","Futbol üçün avadanlıq","Boks üçün avadanlıq","Rollerlər və dayaqlar","Qantellər və çəki daşları","Tennis üçün avadanlıq","Basketbol üçün avadanlıq"] }
  ],

  "Uşaq aləmi": [
    { group: "Uşaq yedirilməsi", items: ["Yedirilmə üçün oturacaqlar","Qidalandırıcılar","Uşaq qab-qacaqları","Əmziklər","Qidalandırıcı üçün isidicilər","Su qabları","Əmzik aksesuarları","Uşaq üçün termoslar","Termo çantalar","Önlüklər","Qidalandırıcılar üçün aksesuarlar"] },
    { group: "Uşaq üçün sağlamlıq, qulluq, gigiyena", items: ["Uşaq üçün şampun","Uşaq üçün salfetlər","Uşaq üçün diş məcunu","Uşaq üçün diş fırçaları","Termometrlər","Uşaq üçün duş geli","Vannalar","Vanna oturacaqları","Güvəclər","Süngərlər","Dırnaq qayçıları","Uşaq üçün daraqlar","Bələmə masaları","Uşaq kremləri","Uşaq üçün bədən yağı","Dişlər üçün oyuncaqlar"] },
    { group: "Hamilələr və analar", items: ["Analar üçün çantalar","Bandajlar"] },
    { group: "Oyunlar və oyuncaqlar", items: ["Yumşaq oyuncaqlar","Hamam oyuncaqları","Musiqili oyuncaqlar","İnteraktiv oyuncaqlar","Oyun xalçaları","Uşaq arabası oyuncaqları","Oyuncaq avtomobillar","Yataq üçün mobillar","Şax-şax oyuncaqlar","Oyuncaq silahlar","Uşaq çantaları","Kuklalar","Hava döşəkləri","Üzgüçülük dairələri"] },
    { group: "Uşaq otağı", items: ["Beşiklər və uşaq çarpayıları","Manejlar","Bələmə masaları","Yastıqlar","Uşaq təhlükəsizliyi","Uşaqlar üçün matraslar","Döşək üzləri","Yorğanlar","Yelləncək və şezlonqlar","Uşaq yataq dəstləri","Yedirmə üçün yastıq"] },
    { group: "Uşaq arabaları və avtomobil oturacaqları", items: ["Uşaq arabaları","Avto oturacaqlar","Yerimə arabaları","Daşınma üçün beşik","Kenqurular","Ehtiyat hissələri və aksesuarlar","Uşaq üçün velosipedlər","Uşaq üçün skuterlər"] }
  ],

  "Ev heyvanları üçün məhsullar": [
    { group: "Ümumi baxım", items: ["Trimmerlər","Daraqlar","Dırnaq qayçıları","Qurulama cihazları"] },
    { group: "Yataq və daşıma çantaları", items: ["Yataqlar","Daşıma çantaları"] },
    { group: "Təmizlik və gigiyena", items: ["Biotualetlər","Qoxu neytrallaşdırıcılar","Zibil torbaları"] },
    { group: "Su və qida qabları", items: ["Portativ su qabları","Avtomatik qidalandırıcı"] }
  ],

  "Təmir tikinti": [],
  "Ev və bağ": [],
  "Geyim və aksesuarlar": [],
  "Xidmətlər, abunəlik və soft": [],
  "Hədiyyə sertifikatları": []
};

// Əsas kateqoriyaların sırayla siyahısı (select-in ilk sütunu üçün)
const CATEGORY_LIST = Object.keys(CATEGORY_TREE);
