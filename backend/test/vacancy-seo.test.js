const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createSeoRouter } = require('../routes/seo');
const { createVacanciesAdminRouter, createVacancyPagesRouter } = require('../routes/vacancies');
const { vacancyPath } = require('../lib/vacancyPaths');
const { jobPosting } = require('../lib/vacancySeo');

test('job pages remain crawlable, truthful, safe and current through the vacancy lifecycle', async t => {
  process.env.JWT_SECRET = 'seo-local-test';
  const job = { id:1, title:'Elektronika sahəsində satıcı tələb olunur!', department:'Essen Home mağazası', location:'Xırdalan', description:'Müştərilərə məlumat vermək.\nSatış prosesini həyata keçirmək.', requirements:'Satış təcrübəsi.', benefits:'', employmentType:'', salary:'', additionalNote:'CV mövzusunda “Satıcı” yazın.', contactEmail:'jobs@example.test', contactPhone:'994101234567', status:'published', position:1, deadline:null, publishedAt:null, createdAt:new Date('2026-10-01T10:00:00Z'), updatedAt:new Date('2026-11-01T10:00:00Z') };
  let offline = false;
  const rows = [job, {...job,id:2,title:'PRIVATE DRAFT',status:'draft'}, {...job,id:3,title:'EXPIRED',deadline:new Date('2000-01-01')}, {...job,id:4,title:'CLOSED',status:'closed'}];
  const db = {
    product:{ count:async()=>0, findUnique:async()=>{throw Error('Vacancy URL incorrectly entered product routing');} },
    vacancy:{
      findMany:async({where,select})=>{if(offline)throw Error('offline');return rows.filter(row=>!where||(row.status===where.status&&(!row.deadline||row.deadline>=where.OR[1].deadline.gte))).map(row=>select?Object.fromEntries(Object.keys(select).map(key=>[key,row[key]])):{...row});},
      findUnique:async({where})=>{if(offline)throw Error('offline');return rows.find(row=>row.id===where.id)||null;},
      create:async({data})=>{const row={id:rows.length+1,createdAt:new Date(),updatedAt:new Date(),...data};rows.push(row);return row;},
      update:async({where,data})=>Object.assign(rows.find(row=>row.id===where.id),data,{updatedAt:new Date()})
    }
  };
  const app=express();app.use(express.json());app.use(createSeoRouter(db));app.use(createVacancyPagesRouter(db));app.use('/api/admin/vacancies',createVacanciesAdminRouter(db));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const base='http://127.0.0.1:'+server.address().port;
  const get=path=>fetch(base+path,{redirect:'manual'});
  const token=jwt.sign({id:1,role:'admin'},process.env.JWT_SECRET);
  const admin=(id,body,method='PATCH')=>fetch(base+'/api/admin/vacancies'+(id?'/'+id:''),{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const graph=html=>JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
  const path=vacancyPath(job);
  assert.equal(path,'/vakansiyalar/1/elektronika-sahesinde-satici');
  let html=await (await get('/vakansiyalar.html')).text();
  assert.match(html,/<title>Satıcı vakansiyası və iş elanları \| Essen Home<\/title>/);
  assert.match(html,/Aktiv vakansiyalar/);assert.ok(html.includes('href="'+path+'"'));
  assert.doesNotMatch(html,/PRIVATE DRAFT|EXPIRED|CLOSED|JobPosting|>Əlavə qeyd</);
  assert.equal(graph(html)[0].mainEntity.numberOfItems,1);
  let response=await get(path);assert.equal(response.status,200);html=await response.text();
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(html,/<title>Satıcı vakansiyası — Xırdalan \| Essen Home<\/title>/);
  assert.match(html,/<h1>Elektronika sahəsində satıcı<\/h1>/);
  assert.ok(html.includes('rel="canonical" href="https://essenhome.az'+path+'"'));
  assert.ok(html.includes('property="og:url" content="https://essenhome.az'+path+'"'));
  assert.match(html,/name="twitter:title" content="Satıcı vakansiyası/);
  assert.ok(html.indexOf('class="vacancy-note"')<html.indexOf('class="application-actions"'));
  assert.match(html,/mailto:jobs%40example.test/);assert.match(html,/wa.me\/994101234567/);
  assert.doesNotMatch(html,/>Əlavə qeyd<|VACANCY_CONTENT/);
  const schema=graph(html).find(x=>x['@type']==='JobPosting');
  assert.equal(schema.title,'Elektronika sahəsində satıcı');assert.equal(schema.datePosted,job.createdAt.toISOString());
  assert.match(schema.description,/<p>Vəzifə haqqında:.*<br>/);assert.match(schema.description,/Satış təcrübəsi/);assert.match(schema.description,/CV mövzusunda/);
  assert.equal(schema.jobLocation.address.addressCountry,'AZ');assert.equal(schema.jobLocation.address.addressLocality,'Xırdalan');
  assert.equal(schema.hiringOrganization.name,'Essen Home');
  for(const key of ['baseSalary','employmentType','validThrough'])assert.equal(schema[key],undefined);
  const withDeadline=jobPosting({...job,deadline:new Date('2030-01-01'),employmentType:'Tam iş günü'});
  assert.equal(withDeadline.validThrough,'2030-01-01T00:00:00.000Z');assert.equal(withDeadline.employmentType,'FULL_TIME');
  for(const url of ['/vakansiyalar/1','/vakansiyalar/1/old-name',path+'/']){
    response=await get(url);assert.equal(response.status,301);assert.equal(response.headers.get('location'),path);
  }
  for(const id of [2,3,4,999,9999999999999999]){
    response=await get('/vakansiyalar/'+id);assert.equal(response.status,404);assert.equal(response.headers.get('x-robots-tag'),'noindex');
    assert.doesNotMatch(await response.text(),/JobPosting|PRIVATE DRAFT|EXPIRED|CLOSED/);
  }
  let sitemap=await (await get('/sitemap-vacancies.xml')).text();
  assert.ok(sitemap.includes('https://essenhome.az'+path));assert.match(sitemap,/2026-11-01T10:00:00.000Z/);assert.doesNotMatch(sitemap,/\/vakansiyalar\/[234]\//);
  assert.match(await (await get('/sitemap.xml')).text(),/sitemap-vacancies.xml/);
  const created=job.createdAt.toISOString();
  assert.equal((await admin(1,{status:'closed'})).status,200);assert.equal(job.publishedAt.toISOString(),created);
  await admin(1,{status:'published',publishedAt:'2099-01-01'});assert.equal(job.publishedAt.toISOString(),created);
  await admin(1,undefined,'DELETE');await admin(1,{status:'published'});assert.equal(job.publishedAt.toISOString(),created);
  await admin(2,{status:'published'});assert.ok(rows[1].publishedAt>rows[1].createdAt);
  const firstPublished=rows[1].publishedAt.toISOString();await admin(2,{description:'Updated description'});assert.equal(rows[1].publishedAt.toISOString(),firstPublished);
  const direct=await (await admin(null,{title:'Kassir',location:'Bakı',description:'Kassa işi',contactEmail:'jobs@example.test',status:'published',publishedAt:'2099-01-01'},'POST')).json();
  assert.ok(new Date(direct.publishedAt)<=new Date());assert.equal(new Date(direct.publishedAt).getFullYear(),new Date().getFullYear());
  job.title='Satıcı </script><script>alert(1)</script> & yeni';job.additionalNote='Qeyd </script><img src=x onerror=alert(1)>';
  html=await (await get(vacancyPath(job))).text();
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>|<img src=x/);assert.equal(graph(html)[0].title,job.title);
  assert.match(graph(html)[0].description,/&lt;\/script&gt;/);
  assert.equal((await get(path)).headers.get('location'),vacancyPath(job));
  assert.ok((await (await get('/sitemap-vacancies.xml')).text()).includes(vacancyPath(job)));
  for(const row of rows)row.status='closed';
  html=await (await get('/vakansiyalar.html')).text();assert.match(html,/<title>Vakansiyalar və iş elanları/);assert.doesNotMatch(html,/Satıcı vakansiyası və iş elanları|JobPosting/);
  offline=true;
  for(const url of ['/vakansiyalar.html',vacancyPath(job),'/sitemap-vacancies.xml']){
    response=await get(url);assert.equal(response.status,503);assert.equal(response.headers.get('x-robots-tag'),'noindex');assert.doesNotMatch(await response.text(),/JobPosting/);
  }
});
