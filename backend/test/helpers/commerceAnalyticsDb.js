const fs = require('node:fs');
const path = require('node:path');
async function createCommerceAnalyticsDb() {
  const {PGlite} = require(process.env.ANALYTICS_TEST_PGLITE);
  const sql = new PGlite();
  await sql.exec(`CREATE TABLE "Product" (id INTEGER PRIMARY KEY,name TEXT,brand TEXT,image TEXT);
    CREATE TABLE "Order" (id INTEGER PRIMARY KEY,status TEXT,total DOUBLE PRECISION,"shippingFee" DOUBLE PRECISION DEFAULT 0,"createdAt" TIMESTAMP(3),"deliveredAt" TIMESTAMP(3));
    CREATE TABLE "OrderItem" (id SERIAL PRIMARY KEY,"orderId" INTEGER,"productId" INTEGER,quantity INTEGER,price DOUBLE PRECISION);
    CREATE TABLE "AnalyticsStart" (id INTEGER PRIMARY KEY,"createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO "AnalyticsStart" (id) VALUES (1);
    CREATE TABLE "AnalyticsVisit" (id SERIAL PRIMARY KEY,"visitorHash" TEXT,"sessionHash" TEXT,"productId" INTEGER,"createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP);
    INSERT INTO "Product" VALUES(1,'Test hob','Essen',''),(2,'Test TV','TCL','');`);
  const migration=fs.readFileSync(path.join(__dirname,'../../prisma/migrations/20261115_commerce_analytics/migration.sql'),'utf8');
  await sql.exec(migration);await sql.exec(migration);
  const tagged = (strings, values) => ({text:strings.reduce((result,part,index)=>result+(index?'$'+index:'')+part,''),values});
  const db = {
    $queryRawUnsafe:async (text,...values)=>(await sql.query(text,values)).rows,
    $queryRaw:async (strings,...values)=>{const q=tagged(strings,values);return (await sql.query(q.text,q.values)).rows;},
    $executeRaw:async (strings,...values)=>{const q=tagged(strings,values);return (await sql.query(q.text,q.values)).affectedRows;},
    product:{findUnique:async ({where})=>(await sql.query('SELECT id FROM "Product" WHERE id=$1',[where.id])).rows[0],count:async ({where}={})=>(await sql.query('SELECT COUNT(*)::int AS count FROM "Product"'+(where?.OR?' WHERE name ILIKE $1 OR brand ILIKE $1':''),where?.OR?['%'+where.OR[0].name.contains+'%']:[])).rows[0].count}
  };
  return {sql,db};
}
module.exports={createCommerceAnalyticsDb};
