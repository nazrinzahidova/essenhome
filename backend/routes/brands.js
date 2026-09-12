const express=require('express');
const multer=require('multer');
const auth=require('../middleware/auth'),admin=require('../middleware/adminCheck');
const fields={id:true,name:true,image:true,active:true,position:true};
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:1}}).single('logo');
function createBrandsRouter(db){
 const router=express.Router();
 const run=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.code==='P2002'?409:e.code==='P2025'?404:503).json({message:e.code==='P2002'?'Bu brend artıq mövcuddur.':e.code==='P2025'?'Brend tapılmadı.':'Əməliyyat alınmadı. Yenidən cəhd edin.'});}};
 router.get('/',run(async(req,res)=>res.set('Cache-Control','no-store').json(await db.brand.findMany({select:fields,orderBy:[{position:'asc'},{name:'asc'}]}))));
 router.get('/:id/logo',run(async(req,res)=>{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)return res.sendStatus(404);const b=await db.brand.findUnique({where:{id},select:{logoData:true,logoMime:true}});if(!b?.logoData)return res.sendStatus(404);res.set({'Content-Type':b.logoMime,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'}).send(Buffer.from(b.logoData));}));
 router.use(auth,admin);
 router.use('/:id',(req,res,next)=>{if(!Number.isSafeInteger(Number(req.params.id))||Number(req.params.id)<1)return res.status(400).json({message:'Brend düzgün deyil.'});next();});
 const form=(req,res,next)=>upload(req,res,e=>e?res.status(400).json({message:'Loqo maksimum 2 MB olmalıdır.'}):next());
 function data(req){
  const name=typeof req.body.name==='string'?req.body.name.trim():'';
  if(!name||name.length>100)throw Error('Brend adı 1–100 simvol olmalıdır.');
  if(!['true','false'].includes(req.body.active))throw Error('Görünmə seçimi düzgün deyil.');
  const position=Number(req.body.position);if(!Number.isInteger(position)||position<0||position>100000)throw Error('Sıra 0–100000 arası olmalıdır.');
  const result={name,active:req.body.active==='true',position};
  if(req.file){const b=req.file.buffer;let mime;
   if(b.length>8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
   else if(b.length>3&&b[0]===255&&b[1]===216&&b[2]===255)mime='image/jpeg';
   else if(b.length>12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP')mime='image/webp';
   if(!mime)throw Error('PNG, JPG və ya WebP şəkli seçin.');
   result.logoData=b;result.logoMime=mime;
  }
  return result;
 }
 function validated(req,res,next){try{req.brandData=data(req);next();}catch(e){res.status(400).json({message:e.message});}}
 router.post('/',form,validated,run(async(req,res)=>{const saved=await db.$transaction(async tx=>{const b=await tx.brand.create({data:req.brandData,select:fields});return req.file?tx.brand.update({where:{id:b.id},data:{image:'/api/brands/'+b.id+'/logo'},select:fields}):b;});res.status(201).json(saved);}));
 router.patch('/:id',form,validated,run(async(req,res)=>{const id=Number(req.params.id);const saved=await db.$transaction(async tx=>{const old=await tx.brand.findUniqueOrThrow({where:{id},select:{name:true}});const b=await tx.brand.update({where:{id},data:{...req.brandData,...(req.file?{image:'/api/brands/'+id+'/logo'}:{})},select:fields});if(old.name!==b.name)await tx.product.updateMany({where:{brand:{equals:old.name,mode:'insensitive'}},data:{brand:b.name}});return b;});res.json(saved);}));
 router.delete('/:id',run(async(req,res)=>{const id=Number(req.params.id);const removed=await db.$transaction(async tx=>{const b=await tx.brand.findUniqueOrThrow({where:{id},select:{name:true}});const count=await tx.product.count({where:{brand:{equals:b.name,mode:'insensitive'}}});if(count)return false;await tx.brand.delete({where:{id}});return true;});res.status(removed?200:409).json(removed?{ok:true}:{message:'Bu brendə bağlı məhsullar var. Əvvəl onların brendini dəyişin və ya brendi ana səhifədən gizlədin.'});}));
 return router;
}
module.exports={createBrandsRouter};
