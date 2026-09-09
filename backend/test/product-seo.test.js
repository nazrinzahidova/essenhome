const {test}=require('node:test'),assert=require('node:assert/strict');
test('custom SEO fields persist through admin create/edit/clear and appear in crawler HTML',{skip:!process.env.HOME_TEST_DATABASE_URL},async t=>{
const url=new URL(process.env.HOME_TEST_DATABASE_URL);assert(['127.0.0.1','localhost'].includes(url.hostname));
await require('../../scripts/migrate-product-seo').migrateProductSeo({connectionString:url.toString(),ssl:false});
const {PrismaClient}=require('../generated/client-v3'),{PrismaPg}=require('@prisma/adapter-pg');
const db=new PrismaClient({adapter:new PrismaPg({connectionString:url.toString(),ssl:false})});
const file=require.resolve('../lib/prisma');require.cache[file]={id:file,filename:file,loaded:true,exports:db};
process.env.JWT_SECRET='local-seo-test';const jwt=require('jsonwebtoken'),express=require('express');
const app=express();app.use(express.json());app.use('/api/admin',require('../routes/admin'));app.use(require('../routes/seo').createSeoRouter(db));
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));let id;
t.after(async()=>{await new Promise(r=>{server.close(r);server.closeAllConnections();});if(id)await db.product.delete({where:{id}});await db.$disconnect();});
const base='http://127.0.0.1:'+server.address().port;
const save=async(method,seo)=>{const fd=new FormData();for(const [k,v] of Object.entries({name:'SEO test product',nameRu:'',description:'Original description',descRu:'',price:'100',category:'Test',stock:'1',...seo}))fd.append(k,v);return fetch(base+'/api/admin/products'+(id?'/'+id:''),{method,headers:{Authorization:'Bearer '+jwt.sign({id:1,role:'admin'},process.env.JWT_SECRET)},body:fd});};
let res=await save('POST',{seoTitle:'Custom SEO title',seoDescription:'Custom SEO description'});assert.equal(res.status,200);let created=await res.json();id=created.id||created.product?.id;assert(id);
let p=await db.product.findUnique({where:{id}});assert.equal(p.seoTitle,'Custom SEO title');assert.equal(p.seoDescription,'Custom SEO description');
let html=await(await fetch(base+'/product.html?id='+id)).text();assert(html.includes('<title>Custom SEO title</title>'));assert(html.includes('name="description" content="Custom SEO description"'));assert(html.includes('<h1>SEO test product</h1>'));
assert.equal((await save('PUT',{seoTitle:'Changed <title>',seoDescription:'Text "quoted"'})).status,200);html=await(await fetch(base+'/product.html?id='+id)).text();assert(html.includes('Changed &lt;title&gt;'));assert(html.includes('Text &quot;quoted&quot;'));
assert.equal((await save('PUT',{})).status,200);assert.equal((await db.product.findUnique({where:{id}})).seoTitle,'Changed <title>');
assert.equal((await save('PUT',{seoTitle:'',seoDescription:''})).status,200);p=await db.product.findUnique({where:{id}});assert.equal(p.seoTitle,null);assert.equal(p.seoDescription,null);html=await(await fetch(base+'/product.html?id='+id)).text();assert(html.includes('<title>SEO test product | Essen Home</title>'));
assert.equal((await save('PUT',{seoTitle:'x'.repeat(201)})).status,400);
});

