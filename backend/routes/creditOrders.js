const express = require('express');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const admin = require('../middleware/adminCheck');

function applicationCode(row) { return String(row.number).padStart(6, '0'); }

function validate(body) {
  const value = {};
  for (const key of ['firstName', 'lastName', 'fatherName']) {
    value[key] = typeof body[key] === 'string' ? body[key].trim() : '';
    if (value[key].length < 2 || value[key].length > 80 || !/^[\p{L}\p{M} '\-]+$/u.test(value[key])) throw new Error('Ad, soyad və ata adını düzgün daxil edin.');
  }
  value.phone = String(body.phone || '').replace(/[\s()+-]/g, '');
  if (/^0\d{9}$/.test(value.phone)) value.phone = '994' + value.phone.slice(1);
  if (!/^994\d{9}$/.test(value.phone)) throw new Error('Telefon nömrəsini +994 XX XXX XX XX formatında daxil edin.');
  value.fin = String(body.fin || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{7}$/.test(value.fin)) throw new Error('FIN kod 7 hərf və ya rəqəmdən ibarət olmalıdır.');
  if (typeof body.hasSima !== 'boolean') throw new Error('SİMA var və ya yoxdur seçin.');
  value.hasSima = body.hasSima;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestKey || '')) throw new Error('Formanı yenidən açıb cəhd edin.');
  value.requestKey = body.requestKey;
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) throw new Error('Səbət boşdur və ya məhsul sayı çoxdur.');
  value.items = body.items.map(item => {
    if (!Number.isInteger(item.productId) || item.productId < 1 || item.productId > 2147483647 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new Error('Məhsul və miqdar düzgün deyil.');
    return {productId:item.productId, quantity:item.quantity, color:String(item.color || '').trim().slice(0,80)};
  });
  const totals = new Map();
  for (const item of value.items) totals.set(item.productId, (totals.get(item.productId) || 0) + item.quantity);
  if ([...totals.values()].some(qty => qty > 20)) throw new Error('Bir məhsuldan maksimum 20 ədəd seçilə bilər.');
  return value;
}

function createCreditOrdersRouter(db) {
  const router = express.Router();
  const attempts = new Map();
  router.use((_req,res,next) => {res.set('Cache-Control','no-store');next();});
  router.post('/', async (req,res) => {
    const now = Date.now(), ip = req.ip;
    for (const [key,entry] of attempts) if (entry.until < now) attempts.delete(key);
    const entry = attempts.get(ip) || {count:0, until:now+15*60*1000};
    if (entry.count >= 30) return res.status(429).set('Retry-After','900').json({message:'Çox sayda cəhd edildi. Bir qədər sonra yenidən yoxlayın.'});
    entry.count++; attempts.set(ip,entry);
    let input;
    try { input = validate(req.body || {}); } catch(error) { return res.status(400).json({message:error.message}); }
    const requestHash = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
    try {
      const previous = await db.creditApplication.findUnique({where:{requestKey:input.requestKey}});
      if (previous) return previous.requestHash === requestHash ? res.json({id:previous.id,code:applicationCode(previous)}) : res.status(409).json({message:'Müraciət dəyişib. Formanı yenidən açın.'});
      const products = await db.product.findMany({where:{id:{in:[...new Set(input.items.map(i=>i.productId))]}}});
      const byId = new Map(products.map(p=>[p.id,p]));
      const quantities = new Map();
      for (const item of input.items) quantities.set(item.productId,(quantities.get(item.productId)||0)+item.quantity);
      for (const [id,qty] of quantities) {
        const p = byId.get(id);
        if (!p || p.stock < qty || !Number.isFinite(Number(p.price)) || Number(p.price) < 0) return res.status(409).json({message:'Səbətdəki məhsullardan biri mövcud deyil və ya stok kifayət etmir. Səbəti yeniləyin.'});
      }
      const items = input.items.map(i=>({...i,name:byId.get(i.productId).name,price:Number(byId.get(i.productId).price)}));
      const total = items.reduce((sum,i)=>sum+Math.round(i.price*100)*i.quantity,0)/100;
      const {requestKey,firstName,lastName,fatherName,phone,fin,hasSima} = input;
      const saved = await db.creditApplication.create({data:{requestKey,requestHash,firstName,lastName,fatherName,phone,fin,hasSima,items,total}});
      res.status(201).json({id:saved.id,code:applicationCode(saved)});
    } catch(error) {
      if (error.code === 'P2002') {
        const previous = await db.creditApplication.findUnique({where:{requestKey:input.requestKey}}).catch(()=>null);
        if (previous?.requestHash === requestHash) return res.json({id:previous.id,code:applicationCode(previous)});
      }
      res.status(503).json({message:'Müraciət göndərilmədi. Məlumatlarınızı saxlayıb yenidən cəhd edin.'});
    }
  });
  router.get('/admin',auth,admin,async(req,res)=>{
    try {
      const page = Math.max(1,Math.min(100000,parseInt(req.query.page,10)||1));
      const [items,count] = await Promise.all([db.creditApplication.findMany({orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*25,take:25}),db.creditApplication.count()]);
      res.json({items,count,page});
    } catch {res.status(503).json({message:'Kredit sifarişləri yüklənmədi.'});}
  });
  router.patch('/admin/:id',auth,admin,async(req,res)=>{
    if (!['new','contacted','completed','cancelled'].includes(req.body.status)) return res.status(400).json({message:'Status düzgün deyil.'});
    try {await db.creditApplication.update({where:{id:req.params.id},data:{status:req.body.status}});res.json({ok:true});}
    catch {res.status(404).json({message:'Müraciət tapılmadı və ya yenilənmədi.'});}
  });
  return router;
}
module.exports = {createCreditOrdersRouter,validate};
