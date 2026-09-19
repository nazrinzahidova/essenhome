# QR kampaniya

Mövcud Express / PostgreSQL saytına əlavə modul. İstifadəçi paneli `index.html?campaign=<source-id>` keçidində açılır, mövcud SMS girişinin `essen:login` hadisəsindən sonra avtomatik davam edir. Hesab menyusundakı və başlıqdakı QR Kampaniya düymələri istifadəçinin nömrələrini göstərir. Admin panelinin QR Kampaniya bölməsi kampaniyaları və mənbələri yaradır, dayandırır, QR SVG yükləyir, iştirakçıları ləğv/bərpa edir, statistikaları və səhifələnən siyahıları göstərir.

## Quraşdırma

1. Kök və backend paket asılılıqlarını quraşdırın. `qrcode` QR şəkillərini serverdə yaradır; xarici QR xidməti istifadə olunmur.
2. `backend/.env` faylında müstəqil `CAMPAIGN_HMAC_SECRET` (ən azı 32 bayt təsadüfi açar) və `PUBLIC_SITE_URL` (saytın real əsas ünvanı) təyin edin. Açarı yalnız bir dəfə yaradın, qoruyun və ehtiyat nüsxədə saxlayın. Kod onu JWT açarından götürmür. Açar dəyişərsə sistem FIN deduplikasiyasını səssiz pozmaq əvəzinə aktivləşməni dayandırır.
3. Mövcud `db push` ilə yaradılmış bazalar üçün `node backend/scripts/migrate-campaigns.js` icra edin. Yalnız yeni kampaniya strukturlarını əlavə edir; əvvəlki cədvəlləri və məlumatları dəyişmir. Tranzaksiya, kilid və checksum təkrar icranı qoruyur. Standart Prisma migration tarixçəsi olan quraşdırmalarda eyni SQL migration Prisma ilə də tətbiq oluna bilər. Bu layihədə tarixçə yoxdursa bütün köhnə migration-ları kor-koranə `migrate deploy` etməyin.
4. `prisma generate --schema=backend/prisma/schema.prisma` və serveri yenidən başladın.
5. Admin panelində kampaniya, sonra QR mənbə yaradın və QR şəklini yükləyin.

## Təhlükəsizlik və sayma qaydaları

- Azərbaycan vətəndaşının 7 simvollu FIN formatı yoxlanır (I/O istisna). Bu, dövlət reyestrindən şəxsiyyət və FIN sahibliyi yoxlaması deyil. Qayda: https://ekabinet.dim.gov.az/pLogin.aspx.
- FIN yalnız POST gövdəsində qəbul edilir; URL, brauzer yaddaşı, tətbiq logu və DB-də açıq mətn kimi saxlanmır. Deduplikasiya HMAC-SHA256 ilə aparılır. Yeni qeydlərdə ayrıca HKDF ilə törədilmiş açarla AES-256-GCM şifrələnmiş FIN saxlanır və yalnız rol yoxlamasından keçmiş admin cavabında açılır. Şifrəli məlumat kampaniya və FIN hash-inə bağlanır. Köhnə hash-lərdən tam FIN bərpa edilmir. İnfrastrukturda HTTP gövdələrinin və SQL bind parametrlərinin loglanmasını söndürün. Production HTTPS istifadə etməlidir.
- `(campaignId, finHash)` və `(campaignId, userId)` DB unique məhdudiyyətləri var. Hər istifadəçi hər kampaniyada bir iştirak əldə edir. Kampaniyalar arasında eyni FIN istifadə edilə bilər.
- Nömrələr bütün kampaniyalar üzrə vahid, tranzaksiya ilə kilidlənən sayğacdan gəlir. İlk uğurlu nömrə `K-0000001`-dir. Uğursuz tranzaksiya nömrə sərf etmir. İştirakın identifikatorlarını dəyişmək DB trigger-i ilə bloklanır. Ləğv FIN-i və nömrəni azad etmir. Səlahiyyətli texniki silinmə FIN-i azad edir, nömrəni isə `CampaignRetiredNumber` cədvəlində daimi rezerv edir; həmin nömrə ilə yeni qeyd DB səviyyəsində bloklanır. İstifadəçi hesabı silindikdə FK null olur, iştirak rezervasiyası saxlanır. Tətbiq DB istifadəçisinə TRUNCATE/DDL icazəsi verməyin.
- QR ziyarəti hər mənbə və brauzer tab sessiyası üçün bir dəfə sayılır. Refresh ayrıca skan yaratmır. Linkin açılışı fiziki kamera skanını sübut etmir. Cihaz/brauzer/OS User-Agent əsasında təxmini məlumatdır. Skanın qeydiyyat statusu istifadəçinin autentifikasiyalı davamını bildirir, yalnız yeni hesabları saymır.
- Skan tokeni imzalıdır, 30 gün qüvvədədir və ilk autentifikasiya sonrası istifadəçiyə bağlanır. Bütün admin endpoint-ləri rolun DB-də aktual qiymətini yoxlayır.
- Limitlər DB-də paylaşılır: 15 dəqiqədə IP üzrə 120 skan, 50 aktivləşdirmə cəhdi; istifadəçi üzrə 10 aktivləşdirmə cəhdi. IP yalnız açarlı hash şəklində saxlanır. Proxy arxasında mövcud serverdə `trust proxy` yalnız real infrastrukturun etibarlı proxy ünvanlarına uyğun qurulmalıdır; təsadüfi X-Forwarded-For qəbul etməyin. Vaxtı bitmiş limitləri periodik `DELETE FROM "CampaignRateLimit" WHERE "expiresAt" < NOW() - INTERVAL '1 day'` ilə təmizləmək olar.
- Dashboard mənbə, cihaz, brauzer, OS və skan tarixi filtrlərinə əsaslanır; ad/status axtarışı yalnız siyahıya tətbiq edilir. Tarix sərhədləri UTC, ekrandakı vaxt istifadəçinin yerli saat qurşağıdır. Ləğv edilmiş iştirak ümumi iştirak sayında qalır.

## Test

`CAMPAIGN_TEST_DATABASE_URL` yalnız ayrıca lokal PostgreSQL bazasını göstərməlidir. `node backend/scripts/test-campaigns.js` unikal test schema-sı yaradır və sonra silir. Eyni FIN üçün paralel yarış, fərqli FIN-lər üçün ardıcıl nömrələr, eyni istifadəçinin paralel müraciətləri, refresh, ləğv, DB məhdudiyyətləri, HMAC açarı dəyişməsi, admin rolları, skan sahibliyi, filtrlər və rate limiting real PostgreSQL-də yoxlanır. Mövcud production bazasında test işləmir.
