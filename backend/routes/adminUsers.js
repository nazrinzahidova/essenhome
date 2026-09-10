const router = require('express').Router();
const prisma = require('../lib/prisma');
const {userCode,fullName} = require('../lib/userIdentity');
router.use(require('../middleware/auth'), require('../middleware/adminCheck'));
router.get('/', async (req,res) => {
  res.set('Cache-Control','no-store');
  const q = String(req.query.q || '').trim().slice(0,150);
  const page = Math.max(1,Math.min(1000000,parseInt(req.query.page,10) || 1));
  const limit = 25;
  const base = {role:{not:'admin'}};
  const idMatch = /^(?:EH-)?0*(\d+)$/i.exec(q);
  const id = idMatch && Number(idMatch[1]);
  const where = {...base};
  if (q) where.OR = [
    ...(Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? [{id}] : []),
    {AND:q.split(/\s+/).map(term=>({OR:['name','firstName','lastName','email','phone'].map(key=>({[key]:{contains:term,mode:'insensitive'}}))}))}
  ];
  try {
    const [total,filtered,users] = await prisma.$transaction([
      prisma.user.count({where:base}), prisma.user.count({where}),
      prisma.user.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*limit,take:limit,
        select:{id:true,firstName:true,lastName:true,name:true,email:true,phone:true,birthDate:true,createdAt:true}})
    ]);
    res.json({total,filtered,page,limit,users:users.map(user=>({...user,userCode:userCode(user.id),fullName:fullName(user)}))});
  } catch { res.status(500).json({message:'İstifadəçilər yüklənmədi. Yenidən cəhd edin.'}); }
});
module.exports = router;
