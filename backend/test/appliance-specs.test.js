const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const read=name=>fs.readFileSync(path.join(__dirname,'../../frontend',name),'utf8');
for(const [file,category,fn,count,split] of [
['appliance','Qabyuyan maşınlar','applianceSpecEntries',35,'Dərinlik'],['appliance','Dispenserlər','applianceSpecEntries',18,'Növ'],['appliance','Ətçəkən maşınlar','applianceSpecEntries',15,'Korpusun materialı'],['appliance','Mikserlər','applianceSpecEntries',15,'Turbo rejim'],['appliance','Tosterlər','applianceSpecEntries',13,'Bölmələrin sayı'],['appliance','Fritoz','applianceSpecEntries',16,'İstehsalçı ölkə'],['appliance','Ütülər','applianceSpecEntries',21,'Su qabının həcmi']])test(category+' fields and edit round trip',()=>{
 let selected=category,visible=false,inputs=[];
 const nodes={f_subcategory:{get value(){return selected}},categorySpecsPanel:{classList:{toggle:(_key,v)=>visible=v}},categorySpecsTitle:{},categorySpecsFields:{}};
 const ctx=vm.createContext({document:{getElementById:id=>nodes[id],querySelectorAll:s=>s==='.category-spec-range'?[]:inputs},escapeHtml:x=>String(x),preservedProductSpecs:{SKU:'keep'}});
 for(const f of ['washingmachine','fridge','freezer'])vm.runInContext(read(f+'-specs.js'),ctx);
 vm.runInContext(read('appliance-specs.js'),ctx);
 const admin=read('admin.js');vm.runInContext(admin.slice(admin.indexOf('function activeSpecificationTemplate()'),admin.indexOf('// ============== RƏNG SEÇİCİSİ')),ctx);
 ctx.renderCategorySpecs({});assert(visible);assert.equal((nodes.categorySpecsFields.innerHTML.match(/class="category-spec-input"/g)||[]).length,count-1);
 const secondKey=ctx.activeSpecificationTemplate().groups[0].fields.find(field=>field.key!=='Rəng').key;
 inputs=[{dataset:{specKey:'Rəng'},value:'Ağ'},{dataset:{specKey:secondKey},value:'36 ay'}];let saved=ctx.mergeCategorySpecs();ctx.renderCategorySpecs(saved);assert(nodes.categorySpecsFields.innerHTML.includes('value="36 ay"'));
 ctx.preservedProductSpecs=saved;inputs[0].value='Boz';inputs[1].value='';const edited=ctx.mergeCategorySpecs();assert.equal(edited.Rəng,'Boz');assert(!(secondKey in edited));assert.equal(edited.SKU,'keep');
 const rows=ctx[fn]({subcategory:category,brand:'Bosch',specs:edited});assert.equal(rows.length,count);assert.equal(rows.find(row=>row[0]==='Brend')[1],'Bosch');assert.equal(rows[Math.ceil(count/2)][0],split);
 selected='Başqa';ctx.renderCategorySpecs({});assert.equal(visible,false);
});
