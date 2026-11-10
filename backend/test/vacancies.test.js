const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createVacanciesAdminRouter, createVacancyPagesRouter } = require('../routes/vacancies');
const { validateVacancy, deadlineValue } = require('../lib/vacancies');

test('vacancy validation handles publishing, plain text, phone numbers and Azerbaijan deadlines', () => {
  const now = new Date('2026-11-10T10:00:00Z');
  assert.deepEqual(validateVacancy({ title:'  Kassir  ' }, null, now).title, 'Kassir');
  assert.equal(validateVacancy({ title:'Kassir' }, null, now).status, 'draft');
  assert.equal(validateVacancy({ title:'Kassir' }, null, now).additionalNote, '');
  const complete = { title:'Satış məsləhətçisi', location:'Xırdalan', description:'Müştərilərlə iş.', contactPhone:'(010) 123-45-67', status:'published', deadline:'2026-11-10' };
  const parsed = validateVacancy(complete, null, now);
  assert.equal(parsed.contactPhone,'994101234567');
  assert.equal(parsed.deadline.toISOString(),'2026-11-10T19:59:59.999Z');
  assert.equal(deadlineValue('2028-02-29').toISOString(),'2028-02-29T19:59:59.999Z');
  for (const changes of [
    {title:''}, {title:'x'.repeat(161)}, {status:'live'}, {position:-1}, {position:'1'},
    {contactEmail:'invalid'}, {contactEmail:'test@example.com\r\nBcc:x@example.com'},
    {contactPhone:'javascript:alert(1)'}, {deadline:'2026-02-31'}, {deadline:'2026-11-09'},
    {description:''}, {location:''}, {contactPhone:''}, {title:'bad\u0000value'},
    {additionalNote:'x'.repeat(4001)}, {additionalNote:42}, {additionalNote:'bad\u0000value'}
  ]) assert.throws(()=>validateVacancy({...complete,...changes},null,now));
  assert.throws(()=>validateVacancy(null,null,now));
  assert.throws(()=>validateVacancy([],null,now));
  assert.equal(validateVacancy({title:'<img src=x onerror=alert(1)>'},null,now).title,'<img src=x onerror=alert(1)>');
  assert.equal(validateVacancy({status:'closed'},parsed,now).status,'closed');
  assert.equal(validateVacancy({deadline:''},parsed,now).deadline,null);
});

test('vacancies protect admin changes and publish only open, unexpired jobs in crawler HTML', async t => {
  process.env.JWT_SECRET = 'vacancies-test-only';
  let rows=[], next=1, offline=false;
  const missing=()=>Object.assign(Error('Missing'),{code:'P2025'});
  const db={vacancy:{
    findMany:async ({where,select})=>{
      if(offline)throw Error('offline');
      const result=rows.filter(row=>!where||(row.status===where.status&&(!row.deadline||row.deadline>=where.OR[1].deadline.gte))).sort((a,b)=>a.position-b.position||b.id-a.id);
      return result.map(row=>select?Object.fromEntries(Object.keys(select).map(key=>[key,row[key]])):{...row});
    },
    findUnique:async ({where})=>rows.find(row=>row.id===where.id)||null,
    create:async ({data})=>{const row={id:next++,createdAt:new Date(),updatedAt:new Date(),...data};rows.push(row);return row;},
    update:async ({where,data})=>{const row=rows.find(row=>row.id===where.id);if(!row)throw missing();return Object.assign(row,data,{updatedAt:new Date()});}
  }};
  const app=express();app.use(express.json());app.use('/api/admin/vacancies',createVacanciesAdminRouter(db));app.use(createVacancyPagesRouter(db));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
  const base='http://127.0.0.1:'+server.address().port;
  const admin=jwt.sign({id:1,role:'admin'},process.env.JWT_SECRET);
  const user=jwt.sign({id:2,role:'user'},process.env.JWT_SECRET);
  const request=(path='',method='GET',body,token=admin)=>fetch(base+'/api/admin/vacancies'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const page=()=>fetch(base+'/vakansiyalar.html');
  for(const [path,method,body] of [['','GET'],['','POST',{title:'test'}],['/1','PATCH',{status:'closed'}],['/1','DELETE']]){
    assert.equal((await request(path,method,body,null)).status,401);
    assert.equal((await request(path,method,body,user)).status,403);
  }
  assert.equal((await request('','POST',{title:''})).status,400);
  const draft=await request('','POST',{title:'PRIVATE DRAFT'});assert.equal(draft.status,201);
  const job=await draft.json();assert.equal(job.status,'draft');
  let response=await page(),html=await response.text();assert.equal(response.status,200);assert.match(html,/Hazırda aktiv vakansiya yoxdur/);assert.doesNotMatch(html,/PRIVATE DRAFT/);
  assert.equal((await request('/'+job.id,'PATCH',{status:'published'})).status,400);
  const title='Satış <script>alert("x")</script> & məsləhətçi';
  const published=await request('/'+job.id,'PATCH',{title,location:'Xırdalan',description:'İş haqqında\nİkinci sətir',requirements:'<img src=x onerror=alert(1)>',contactEmail:'jobs@example.com',contactPhone:'+994 10 123 45 67',status:'published'});
  assert.equal(published.status,200);
  response=await page();html=await response.text();assert.equal(response.headers.get('cache-control'),'no-store');
  assert.match(html,/Satış &lt;script&gt;/);assert.doesNotMatch(html,/<script>alert/);assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html,/mailto:jobs%40example.com\?subject=/);assert.match(html,/https:\/\/wa.me\/994101234567\?text=/);
  assert.match(html,new RegExp('id="vakansiya-'+job.id+'"'));assert.doesNotMatch(html,/VACANCY_CONTENT|PRIVATE DRAFT/);
  assert.doesNotMatch(html,/class="vacancy-note"/);
  const note='Əlavə məlumat <script>alert(1)</script>\nİkinci sətir';
  const noted=await request('/'+job.id,'PATCH',{additionalNote:note});assert.equal(noted.status,200);assert.equal((await noted.json()).additionalNote,note);
  await request('/'+job.id,'PATCH',{salary:'Razılaşma ilə'});
  assert.equal((await (await request()).json()).find(row=>row.id===job.id).additionalNote,note);
  html=await (await page()).text();assert.match(html,/Əlavə məlumat &lt;script&gt;alert\(1\)&lt;\/script&gt;\nİkinci sətir/);assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
  assert.ok(html.indexOf('class="vacancy-note"')<html.indexOf('class="application-actions"'));
  assert.doesNotMatch(html,/>Əlavə qeyd<|Açıq vakansiyalar/);assert.match(html,/id="vacancies-title">Aktiv vakansiyalar/);
  assert.equal((await request('/'+job.id,'PATCH',{additionalNote:''})).status,200);
  assert.doesNotMatch(await (await page()).text(),/class="vacancy-note"/);
  assert.equal((await request('/'+job.id,'PATCH',{status:'closed'})).status,200);
  assert.doesNotMatch(await (await page()).text(),/Satış &lt;script&gt;/);
  await request('/'+job.id,'PATCH',{status:'published'});
  rows[0].deadline=new Date(Date.now()-1000);
  assert.doesNotMatch(await (await page()).text(),/Satış &lt;script&gt;/);
  assert.equal((await request('/'+job.id,'PATCH',{status:'published'})).status,400);
  assert.equal((await request('/'+job.id,'DELETE')).status,200);assert.equal(rows.length,1);assert.equal(rows[0].status,'archived');
  assert.equal((await request('/'+job.id,'PATCH',{status:'draft',deadline:''})).status,200);
  assert.equal((await request('/'+job.id,'PATCH',{status:'published'})).status,200);
  assert.match(await (await page()).text(),/Satış &lt;script&gt;/);
  const second=await (await request('','POST',{title:'First in order',location:'Bakı',description:'Test',contactEmail:'jobs@example.com',status:'published',position:0})).json();
  html=await (await page()).text();assert.ok(html.indexOf('vakansiya-'+second.id)<html.indexOf('vakansiya-'+job.id));
  const listResponse=await request();assert.equal(listResponse.headers.get('cache-control'),'no-store');assert.equal((await listResponse.json()).length,2);
  for(const id of ['0','-1','bad','999999999999999999'])assert.equal((await request('/'+id,'PATCH',{title:'x'})).status,400);
  assert.equal((await request('/999','PATCH',{title:'x'})).status,404);assert.equal((await request('/999','DELETE')).status,404);
  response=await fetch(base+'/vakansiyalar',{redirect:'manual'});assert.equal(response.status,301);assert.equal(response.headers.get('location'),'/vakansiyalar.html');
  offline=true;response=await page();assert.equal(response.status,503);assert.equal(response.headers.get('x-robots-tag'),'noindex');html=await response.text();assert.match(html,/Vakansiyalar yüklənmədi/);assert.doesNotMatch(html,/Hazırda aktiv vakansiya yoxdur/);
  assert.equal((await request()).status,503);
});
