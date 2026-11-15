const express = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/adminCheck');
const { IMAGE_SELECT, serializeProduct } = require('../lib/productImages');

function validateSettings(body) {
  const clean = (value, required = true) => {
    if (typeof value !== 'string' || value.trim().length > 160 || (required && !value.trim())) throw Error('Adları və axtarış sözlərini düzgün daxil edin (maksimum 160 simvol).');
    return value.trim();
  };
  if (!Array.isArray(body.terms) || body.terms.length > 50 || !Array.isArray(body.categories) || body.categories.length > 40) throw Error('Maksimum 50 axtarış və 40 kateqoriya əlavə edə bilərsiniz.');
  if (!Number.isSafeInteger(body.version) || body.version < 0) throw Error('Siyahını yeniləyib yenidən cəhd edin.');
  const terms = body.terms.map(item => ({text:clean(item.text), query:clean(item.query || item.text)}));
  const categories = body.categories.map(item => ({name:clean(item.name), category:clean(item.category), subcategory:clean(item.subcategory || '',false)}));
  if (new Set(terms.map(item=>item.query.toLocaleLowerCase('az'))).size !== terms.length) throw Error('Eyni axtarış sözü təkrarlanmamalıdır.');
  if (new Set(categories.map(item=>item.category+'\n'+item.subcategory)).size !== categories.length) throw Error('Eyni kateqoriya təkrarlanmamalıdır.');
  return {terms,categories,version:body.version};
}
function createSearchDiscoveryRouter(db) {
  const router = express.Router();
  const run = fn => async(req,res) => {try {await fn(req,res);} catch(error) {res.status(error.code==='P2003'?404:503).json({message:error.code==='P2003'?'Məhsul tapılmadı.':'Search məlumatları alınmadı və ya saxlanmadı. Yenidən cəhd edin.'});}};
  const settings = async() => (await db.$queryRaw`SELECT "terms", "categories", "version" FROM "SearchDiscovery" WHERE "id"=1`)[0] || {terms:[],categories:[],version:0};
  async function data() {
    const config = await settings();
    const members = await db.$queryRaw`SELECT "productId", "position" FROM "SearchDiscoveryProduct" ORDER BY "position", "productId"`;
    const products = members.length ? await db.product.findMany({where:{id:{in:members.map(row=>row.productId)}},include:{images:{select:IMAGE_SELECT,orderBy:[{position:'asc'},{id:'asc'}]}}}) : [];
    const byId = new Map(products.map(product=>[product.id,serializeProduct(product)]));
    return {...config,products:members.filter(row=>byId.has(row.productId)).map(row=>({...byId.get(row.productId),searchPosition:row.position}))};
  }
  router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  router.get('/',run(async(_req,res)=>{const value=await data();delete value.version;res.json(value);}));
  router.use(auth,admin);
  router.get('/admin',run(async(_req,res)=>res.json(await data())));
  router.put('/admin',async(req,res,next)=>{try{req.settings=validateSettings(req.body || {});next();}catch(error){res.status(400).json({message:error.message});}},run(async(req,res)=>{
    const {terms,categories,version}=req.settings;
    const changed=await db.$executeRaw`UPDATE "SearchDiscovery" SET "terms"=${JSON.stringify(terms)}::jsonb,"categories"=${JSON.stringify(categories)}::jsonb,"version"="version"+1 WHERE "id"=1 AND "version"=${version}`;
    if(!changed)return res.status(409).json({message:'Siyahı başqa pəncərədə dəyişib. Yenilə düyməsinə basıb təkrar yoxlayın.'});
    res.json(await data());
  }));
  router.put('/products/:id',run(async(req,res)=>{
    const id=Number(req.params.id), {selected,position}=req.body || {};
    if(!Number.isSafeInteger(id)||id<1||typeof selected!=='boolean'||!Number.isInteger(position)||position<0||position>100000)return res.status(400).json({message:'Məhsul və sıra düzgün deyil.'});
    if(selected){
      if(!await db.product.findUnique({where:{id},select:{id:true}}))return res.status(404).json({message:'Məhsul tapılmadı.'});
      await db.$executeRaw`INSERT INTO "SearchDiscoveryProduct" ("productId","position") VALUES (${id},${position}) ON CONFLICT ("productId") DO UPDATE SET "position"=EXCLUDED."position"`;
    } else await db.$executeRaw`DELETE FROM "SearchDiscoveryProduct" WHERE "productId"=${id}`;
    res.json(await data());
  }));
  return router;
}
module.exports={createSearchDiscoveryRouter,validateSettings};
