const crypto = require('crypto');
const COOKIE = 'essen_guest_chat';
const cookieOptions = { httpOnly:true, sameSite:'strict', path:'/api/chats', maxAge:30 * 24 * 60 * 60 * 1000 };

function tokenFrom(req) {
  const raw = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(COOKIE + '='));
  const token = raw?.slice(COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(token || '') ? token : null;
}
function keyFor(token) { return 'guest:' + crypto.createHash('sha256').update(token).digest('hex'); }
function sameSite(req, res, next) {
  if (req.headers['sec-fetch-site'] === 'cross-site') return res.status(403).json({message:'Sorğu qəbul edilmədi'});
  if (req.headers.origin) {
    try { if (new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({message:'Sorğu qəbul edilmədi'}); }
    catch { return res.status(403).json({message:'Sorğu qəbul edilmədi'}); }
  }
  next();
}

module.exports = function guestChat(prisma, publish, openStream) {
  const router = require('express').Router();
  router.use(sameSite);
  const starts = new Map();
  function allow(key, limit) {
    const now=Date.now();
    for (const [id, bucket] of starts) if (bucket.until <= now) starts.delete(id);
    const bucket=starts.get(key) || {count:0,until:now+60000};
    bucket.count++; starts.set(key,bucket);
    return bucket.count <= limit;
  }
  async function find(req) {
    const token=tokenFrom(req);
    return token ? prisma.chatSession.findFirst({where:{chatKey:keyFor(token),userId:null,status:'open'}}) : null;
  }
  router.post('/session', async (req,res) => {
    try {
      let session=await find(req);
      if (!session) {
        if (!allow('start:'+req.ip,120)) return res.status(429).json({message:'Bir az sonra yenidən cəhd edin'});
        const token=crypto.randomBytes(32).toString('hex');
        session=await prisma.chatSession.create({data:{chatKey:keyFor(token),userId:null,name:'Ziyarətçi',phone:''}});
        res.cookie(COOKIE,token,{...cookieOptions,secure:req.secure || req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production'});
      }
      res.set('Cache-Control','no-store').json({id:session.id,name:session.name});
    } catch { res.status(500).json({message:'Çat açıla bilmədi. Yenidən cəhd edin.'}); }
  });
  router.use(async (req,res,next) => {
    try {
      req.guestChat=await find(req);
      if (!req.guestChat) return res.status(401).json({message:'Çat sessiyası yenilənməlidir'});
      res.set('Cache-Control','no-store'); next();
    } catch { res.status(500).json({message:'Çat hazırda əlçatan deyil'}); }
  });
  router.get('/messages',async (req,res) => {
    try { res.json(await prisma.chatMessage.findMany({where:{sessionId:req.guestChat.id},orderBy:{createdAt:'asc'}})); }
    catch { res.status(500).json({message:'Mesajlar yüklənmədi'}); }
  });
  router.post('/messages',async (req,res) => {
    const text=typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text || text.length > 2000) return res.status(400).json({message:'Mesaj 1–2000 simvol olmalıdır'});
    if (!allow('message:'+req.guestChat.id,60)) return res.status(429).json({message:'Mesajları bir az fasilə ilə göndərin'});
    try {
      const sessionId=req.guestChat.id;
      const message=await prisma.chatMessage.create({data:{sessionId,sender:'user',text}});
      await prisma.chatSession.update({where:{id:sessionId},data:{updatedAt:new Date()}});
      publish({type:'message',sessionId,userId:null,message});
      res.status(201).json(message);
    } catch { res.status(500).json({message:'Mesaj göndərilmədi. Yenidən cəhd edin.'}); }
  });
  router.get('/stream',(req,res)=>openStream(req,res,event=>event.sessionId === req.guestChat.id));
  return router;
};
module.exports.guestKey = req => { const token = tokenFrom(req); return token ? keyFor(token) : null; };
