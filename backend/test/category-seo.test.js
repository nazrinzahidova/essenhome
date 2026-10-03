const {test}=require('node:test'),assert=require('node:assert/strict'),express=require('express');
const {createSeoRouter}=require('../routes/seo');
const {productPath}=require('../lib/productImages');
test('SEO delivers crawlable category content, visibility rules, category sitemap and escaped product specifications',async t=>{
 const products=[
  {id:1,name:'Test washer',category:'Appliances',subcategory:'Washers',price:150,stock:1,description:'Installation note',specs:{SKU:'hidden',Capacity:'6 kg'},placements:[],images:[{id:11,position:0,isPrimary:true}]},
  {id:2,name:'Featured phone',category:'Phones',subcategory:'Smartfonlar',price:200,stock:1,placements:[],images:[]},
  {id:3,name:'Hidden phone',category:'Phones',subcategory:'Smartfonlar',price:250,stock:1,placements:[],images:[]},
  {id:4,name:'Hidden laptop',category:'Laptops',subcategory:'Notbuklar',price:300,stock:1,placements:[],images:[]}
 ];
 let failed=false;
 const db={product:{findMany:async()=>{if(failed)throw Error('offline');return products;},findUnique:async({where})=>products.find(p=>p.id===where.id)},homeSection:{findMany:async()=>[{products:[{productId:2}]}]}};
 const app=express();app.use(createSeoRouter(db));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>{server.close(r);server.closeAllConnections();}));
 const get=url=>fetch('http://127.0.0.1:'+server.address().port+url);
 const schema=html=>JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
 let html=await(await get('/catalog.html?category=Appliances&subcategory=Washers')).text();
 assert.match(html,/<h2>Test washer<\/h2>/);assert.match(html,/href="https:\/\/essenhome.az\/washers\/test-washer-1"/);assert.doesNotMatch(html,/id="productGrid" class="hidden/);assert.equal(schema(html).mainEntity.numberOfItems,1);
 html=await(await get('/catalog.html?category=Phones')).text();assert.match(html,/<h2>Featured phone<\/h2>/);assert.doesNotMatch(html,/<h2>Hidden phone<\/h2>/);
 for(const url of ['/catalog.html?search=washer','/catalog.html?category=Empty'])assert.match(await(await get(url)).text(),/noindex,follow/);
 html=await(await get('/sitemap-pages.xml')).text();assert.match(html,/&amp;subcategory=Washers/);assert.match(html,/category=Phones/);assert.doesNotMatch(html,/category=Laptops/);
 html=await(await get(productPath(products[0]))).text();let initial=html.split('<section id="view">')[1].split('</section>')[0];assert.match(initial,/<dt>Capacity<\/dt><dd>6 kg<\/dd>/);assert.doesNotMatch(initial,/<dt>SKU<\/dt>/);assert(initial.indexOf('Xüsusiyyətlər')<initial.indexOf('Əlavə qeydlər'));assert.equal(schema(html)[0].offers.price,150);
 products[0].seoTitle='Custom title';products[0].seoDescription='Test washer — nağd və kreditlə əldə edin';html=await(await get(productPath(products[0]))).text();assert.match(html,/<title>Custom title<\/title>/);assert.match(html,/content="Test washer — nağd və kreditlə əldə edin"/);
 products[0].name='Model </script><script>alert(1)</script>';html=await(await get('/catalog.html?category=Appliances')).text();assert(!html.includes('<script>alert(1)</script>'));assert.equal(schema(html).mainEntity.itemListElement[0].name,products[0].name);
 failed=true;assert.equal((await get('/catalog.html')).status,503);assert.equal((await get('/sitemap-pages.xml')).status,503);
});
