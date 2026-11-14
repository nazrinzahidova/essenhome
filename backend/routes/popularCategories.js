const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const admin = require('../middleware/adminCheck');
const { IMAGE_SELECT, serializeProduct } = require('../lib/productImages');

const fields = { id:true, name:true, category:true, subcategory:true, image:true, position:true, active:true };
const upload = multer({ storage:multer.memoryStorage(), limits:{ fileSize:2*1024*1024, files:1, fields:8 } }).single('imageFile');
const serialize = row => ({ ...row, url:'/catalog.html?' + new URLSearchParams({category:row.category, ...(row.subcategory ? {subcategory:row.subcategory} : {})}) });

function createPopularCategoriesRouter(db) {
  const router = express.Router();
  const run = fn => async (req,res) => {
    try { await fn(req,res); }
    catch (error) {
      const status = error.code==='P2025' ? 404 : error.code==='P2002' ? 409 : 503;
      res.status(status).json({message:status===404?'Kateqoriya tapılmadı.':status===409?'Bu kateqoriya artıq siyahıdadır. Mövcud kartı redaktə edin.':'Dəyişiklik saxlanmadı. Yenidən cəhd edin.'});
    }
  };
  const list = active => db.popularCategory.findMany({where:active?{active:true}:{},select:fields,orderBy:[{position:'asc'},{id:'asc'}]});
  router.get('/',run(async (_req,res) => res.set('Cache-Control','no-store').json((await list(true)).map(serialize))));
  router.get('/:id/image',run(async (req,res) => {
    const id=Number(req.params.id);
    if(!Number.isSafeInteger(id)||id<1)return res.sendStatus(404);
    const row=await db.popularCategory.findUnique({where:{id},select:{imageData:true,imageMime:true}});
    if(!row?.imageData)return res.sendStatus(404);
    res.set({'Content-Type':row.imageMime,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'}).send(Buffer.from(row.imageData));
  }));
  router.use(auth,admin);
  router.get('/admin',run(async (_req,res) => res.set('Cache-Control','no-store').json((await list(false)).map(serialize))));
  router.use('/:id',(req,res,next) => {
    if(!Number.isSafeInteger(Number(req.params.id))||Number(req.params.id)<1)return res.status(400).json({message:'Kateqoriya düzgün deyil.'});
    next();
  });
  const form=(req,res,next)=>upload(req,res,error=>error?res.status(400).json({message:'PNG, JPG və ya WebP şəkli seçin (maksimum 2 MB).'}):next());
  function imageData(file) {
    if(!file)return {};
    const b=file.buffer;let imageMime;
    if(b.length>8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))imageMime='image/png';
    else if(b.length>3&&b[0]===255&&b[1]===216&&b[2]===255)imageMime='image/jpeg';
    else if(b.length>12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')imageMime='image/webp';
    else throw Error('PNG, JPG və ya WebP şəkli seçin.');
    return {imageData:b,imageMime};
  }
  function validate(req,res,next) {
    try {
      const data={};
      for(const key of ['name','category','subcategory']) {
        if(typeof req.body[key]!=='string'||req.body[key].trim().length>160)throw Error('Kateqoriya və kart adını düzgün daxil edin.');
        data[key]=req.body[key].trim();
      }
      if(!data.name||!data.category)throw Error('Kateqoriya və kart adı mütləqdir.');
      if(!['true','false'].includes(req.body.active))throw Error('Görünmə seçimi düzgün deyil.');
      data.active=req.body.active==='true';
      data.position=Number(req.body.position);
      if(!/^\d+$/.test(req.body.position)||!Number.isInteger(data.position)||data.position<0||data.position>100000)throw Error('Sıra 0–100000 arası olmalıdır.');
      Object.assign(data,imageData(req.file));
      req.cardData=data; next();
    } catch(error) { res.status(400).json({message:error.message}); }
  }
  async function automaticImage(data) {
    const product=await db.product.findFirst({where:{category:data.category,...(data.subcategory?{subcategory:data.subcategory}:{})},orderBy:[{stock:'desc'},{id:'desc'}],include:{images:{select:IMAGE_SELECT,orderBy:[{position:'asc'},{id:'asc'}]}}});
    return serializeProduct(product)?.image || '/img/popular-categories/category.svg';
  }
  router.patch('/:id/image',form,(req,res,next)=>{
    try {
      if(!req.file&&req.body?.resetImage!=='true')throw Error('Yeni şəkil seçin və ya avtomatik məhsul şəklini işarələyin.');
      req.newImageData=imageData(req.file);next();
    } catch(error){res.status(400).json({message:error.message});}
  },run(async(req,res)=>{
    const id=Number(req.params.id);
    let data;
    if(req.file)data={...req.newImageData,image:`/api/popular-categories/${id}/image`};
    else {
      const card=await db.popularCategory.findUniqueOrThrow({where:{id},select:{category:true,subcategory:true}});
      data={image:await automaticImage(card),imageData:null,imageMime:null};
    }
    res.json(serialize(await db.popularCategory.update({where:{id},data,select:fields})));
  }));
  router.post('/',form,validate,run(async (req,res) => {
    const saved=await db.$transaction(async tx=>{
      const row=await tx.popularCategory.create({data:{...req.cardData,image:await automaticImage(req.cardData)},select:fields});
      return req.file?tx.popularCategory.update({where:{id:row.id},data:{image:`/api/popular-categories/${row.id}/image`},select:fields}):row;
    });
    res.status(201).json(serialize(saved));
  }));
  router.patch('/:id',form,validate,run(async (req,res) => {
    const id=Number(req.params.id), data=req.cardData;
    const old=await db.popularCategory.findUniqueOrThrow({where:{id},select:{category:true,subcategory:true}});
    if(req.file)data.image=`/api/popular-categories/${id}/image`;
    else if(old.category!==data.category||old.subcategory!==data.subcategory||req.body.resetImage==='true') {
      data.image=await automaticImage(data);data.imageData=null;data.imageMime=null;
    }
    res.json(serialize(await db.popularCategory.update({where:{id},data,select:fields})));
  }));
  // Removing a card only hides it; catalogue categories and products remain intact.
  router.patch('/:id/visibility',run(async (req,res) => {
    if(typeof req.body.active!=='boolean')return res.status(400).json({message:'Görünmə seçimi düzgün deyil.'});
    res.json(serialize(await db.popularCategory.update({where:{id:Number(req.params.id)},data:{active:req.body.active},select:fields})));
  }));
  return router;
}
module.exports={createPopularCategoriesRouter};
