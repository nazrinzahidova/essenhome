const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {createSeoRouter,renderProduct}=require('../routes/seo');
const {productPath}=require('../lib/productImages');
test('SEO delivers crawlable category content, visibility rules, category sitemap and escaped product specifications',async t=>{
 const products=[
  {id:1,name:'Test washer',category:'Appliances',subcategory:'Washers',price:150,stock:1,description:'Installation note',specs:{SKU:'hidden',Capacity:'6 kg'},placements:[],images:[{id:11,position:0,isPrimary:true}]},
  {id:2,name:'Featured phone',category:'Phones',subcategory:'Smartfonlar',price:200,stock:1,placements:[],images:[]},
  {id:3,name:'Hidden phone',category:'Phones',subcategory:'Smartfonlar',price:250,stock:1,placements:[],images:[]},
  {id:4,name:'Hidden laptop',category:'Laptops',subcategory:'Notbuklar',price:300,stock:1,placements:[],images:[]},
  {id:5,name:'Televizor Samsung UE32F6000FUXRU',brand:'Samsung',category:'TV',subcategory:'Televizorlar',price:150,stock:1,specs:{'Ekranın diaqonalı':'32" (81 sm)'},placements:[],images:[]}
 ];
 let failed=false;
 const db={product:{findMany:async()=>{if(failed)throw Error('offline');return products;},findUnique:async({where})=>products.find(p=>p.id===where.id)},homeSection:{findMany:async()=>[{products:[{productId:2}]}]}};
 const app=express();app.use(createSeoRouter(db));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections();}));
 const get=url=>fetch('http://127.0.0.1:'+server.address().port+url);
 const schema=html=>JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 let html=await(await get('/catalog.html?category=Appliances&subcategory=Washers')).text();
 assert.match(html,/<h2>Test washer<\/h2>/);assert.match(html,/href="https:\/\/essenhome.az\/washers\/test-washer-1"/);assert.doesNotMatch(html,/id="productGrid" class="hidden/);assert.equal(schema(html).mainEntity.numberOfItems,1);
 html=await(await get('/catalog.html?category=Phones')).text();assert.match(html,/<h2>Smartfon Featured phone<\/h2>/);assert.doesNotMatch(html,/Hidden phone/);
 html=await(await get('/catalog.html?category=TV')).text();assert.match(html,/<a href="[^"]+ue32f6000fuxru-5" data-product-id="5"><h2>Samsung 32 düym televizor UE32F6000FUXRU<\/h2><\/a>/);
 for(const url of ['/catalog.html?search=washer','/catalog.html?category=Empty'])assert.match(await(await get(url)).text(),/noindex,follow/);
 html=await(await get('/sitemap-pages.xml')).text();assert.match(html,/&amp;subcategory=Washers/);assert.match(html,/category=Phones/);assert.doesNotMatch(html,/category=Laptops/);
 html=await(await get(productPath(products[0]))).text();let initial=html.split('<section id="view">')[1].split('</section>')[0];assert.match(initial,/<dt>Capacity<\/dt><dd>6 kg<\/dd>/);assert.doesNotMatch(initial,/<dt>SKU<\/dt>/);assert(initial.indexOf('Xüsusiyyətlər')<initial.indexOf('Əlavə qeydlər'));assert.equal(schema(html)[0].offers.price,150);
 products[0].seoTitle='Custom title';products[0].seoDescription='Test washer with installation instructions';html=await(await get(productPath(products[0]))).text();assert.match(html,/<title>Custom title<\/title>/);assert.match(html,/content="Test washer with installation instructions"/);
 products[0].name='Model </script><script>alert(1)</script>';html=await(await get('/catalog.html?category=Appliances')).text();assert(!html.includes('<script>alert(1)</script>'));assert.equal(schema(html).mainEntity.itemListElement[0].name,products[0].name);
 failed=true;assert.equal((await get('/catalog.html')).status,503);assert.equal((await get('/sitemap-pages.xml')).status,503);
});

test('product pages expose each saved specification and use meaningful search highlights', () => {
 const template='<head><title>Product</title></head><section id="view"></section>';
 const render=(name,specs,custom={})=>renderProduct(template,{id:42,name,price:150,stock:1,specs,...custom});
 const structured=html=>JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])[0];
 const washerSpecs={'Çamaşırların maksimum yüklənməsi':'11 kq','Çamaşırların qurutma zamanı maksimum yüklənməsi':'7 kq','Maksimal sıxma sürəti':'1400 dövr/dəq','Ölçülər':'85 × 60 × 55 sm','SKU':'internal',Empty:' — ',Blank:[],Zero:0,Steam:false};
 const washer=render('LG paltaryuyan və qurudan maşın',washerSpecs);
 assert.match(washer,/<title>LG paltaryuyan və qurudan maşın — 11 kq \| Essen Home<\/title>/);
 assert.match(washer,/name="description" content="[^"]*Yuma tutumu: 11 kq, Qurutma tutumu: 7 kq, Maksimal sıxma sürəti: 1400 dövr\/dəq/);
 assert.match(washer,/<dt>Ölçülər<\/dt><dd>85 × 60 × 55 sm<\/dd>/);
 const props=Object.fromEntries(structured(washer).additionalProperty.map(({name,value})=>[name,value]));
 assert.equal(props['Çamaşırların qurutma zamanı maksimum yüklənməsi'],'7 kq');
 assert.equal(props.Zero,'0');assert.equal(props.Steam,'Yox');
 for(const name of ['SKU','Empty','Blank'])assert.equal(props[name],undefined);
 const phone=render('Samsung 256GB',{'Daxili yaddaş':'256 GB','Operativ yaddaş':'8 GB','Qoşulma':['Wi-Fi','Bluetooth']});
 assert.match(phone,/<title>Samsung 256GB \| Essen Home<\/title>/);
 assert.match(phone,/<dt>Qoşulma<\/dt><dd>Wi-Fi, Bluetooth<\/dd>/);
 const tv=render('Premier televizor',{'Ekranın diaqonalı':'55 düym','Ekran icazəsi':'4K UHD'});
 assert.match(tv,/<title>Premier televizor — 55 düym \| Essen Home<\/title>/);
 assert.match(tv,/name="description" content="[^"]*4K UHD/);
 const samsungSpecs={'Ekranın diaqonalı':'32" (81 sm)'};
 const samsung=render('Televizor Samsung UE32F6000FUXRU',samsungSpecs,{brand:'Samsung',seoTitle:'Televizor Samsung UE32F6000FUXRU - 577.99 | ESSEN HOME'});
 assert.match(samsung,/<title>Samsung 32 düym televizor UE32F6000FUXRU \| Essen Home<\/title>/);
 assert.match(samsung,/<h1>Samsung 32 düym televizor UE32F6000FUXRU<\/h1>/);
 assert.match(samsung,/name="description" content="Samsung 32 düym televizor/);
 assert.equal(structured(samsung).additionalProperty[0].value,'32" (81 sm)');
 assert.equal(structured(samsung).model,'UE32F6000FUXRU');
 const phoneWithModel=render('Samsung Galaxy A08 (SM-A085) 6/128 GB',{'Ekran':'6.7"','Daxili yaddaş':'128 GB'},{brand:'Samsung',subcategory:'Smartfonlar'});
 assert.match(phoneWithModel,/<h1>Smartfon Samsung Galaxy A08 \(SM-A085\) 6\/128 GB<\/h1>/);
 assert.equal(structured(phoneWithModel).model,'SM-A085');
 const conditioner=render('Kondisioner Shahs SH-12H',{'Səmərəlilik':'12000 BTU'},{brand:'Shahs',seoTitle:'Kondisioner Shahs SH-12H | ESSEN HOME'});
 assert.match(conditioner,/<title>Kondisioner Shahs SH-12H — 12000 BTU \| Essen Home<\/title>/);
 assert.equal(structured(conditioner).model,'SH-12H');
 const cooktop=render('Bişirmə paneli Elleti VC 2060',{'Ocaq sayı':'4 ədəd'},{brand:'Elleti'});
 assert.match(cooktop,/<h1>Bişirmə paneli Elleti VC 2060 — 4 ocaq<\/h1>/);
 assert.equal(structured(cooktop).model,'VC 2060');
 const customTv=render('Televizor Samsung UE32F6000FUXRU',samsungSpecs,{brand:'Samsung',seoTitle:'Manual Samsung TV title'});
 assert.match(customTv,/<title>Manual Samsung TV title<\/title>/);
 const unknownTv=render('Televizor Samsung UE32F6000FUXRU',{'Ekranın diaqonalı':'81 sm'},{brand:'Samsung'});
 assert.doesNotMatch(unknownTv,/<h1>Samsung 32 düym/);
 const custom=render('LG',washerSpecs,{seoTitle:'Manual title',seoDescription:'Manual description'});
 assert.match(custom,/<title>Manual title<\/title>/);
 assert.match(custom,/name="description" content="Manual description"/);
 assert.equal(structured(custom).additionalProperty.length,6);
 const generated=render('Elleti VC 2060',{'Bişirmə səthinin materialı':'Şüşə-keramika'},{seoDescription:'Elleti VC 2060 — nağd və kreditlə əldə edin'});
 assert.match(generated,/name="description" content="[^"]*Bişirmə səthinin materialı: Şüşə-keramika/);
 const empty=render('Unspecified product',null);
 assert.match(empty,/<title>Unspecified product — qiyməti və kreditlə satış \| Essen Home<\/title>/);
 assert.equal(structured(empty).additionalProperty,undefined);
});
