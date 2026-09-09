const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const path=require('path');const read=name=>fs.readFileSync(path.join(__dirname,'../../frontend',name),'utf8');
test('vacuum admin fields add/edit/clear, category visibility and product row order',()=>{
 let selected='Tozsoranlar',visible=false,inputs=[];
 const nodes={f_subcategory:{get value(){return selected;}},categorySpecsPanel:{classList:{toggle:(_name,value)=>visible=value}},categorySpecsTitle:{},categorySpecsFields:{}};
 const ctx=vm.createContext({document:{getElementById:id=>nodes[id],querySelectorAll:selector=>selector==='.category-spec-range'?[]:inputs},escapeHtml:value=>String(value),preservedProductSpecs:{SKU:'keep'}});
 vm.runInContext(read('vacuum-specs.js'),ctx);
 const admin=read('admin.js');vm.runInContext(admin.slice(admin.indexOf('function activeSpecificationTemplate()'),admin.indexOf('// ============== RƏNG SEÇİCİSİ')),ctx);
 ctx.renderCategorySpecs({});assert.equal(visible,true);assert.equal((nodes.categorySpecsFields.innerHTML.match(/class="category-spec-input"/g)||[]).length,17);
 inputs=[{dataset:{specKey:'Güc'},value:'1600 Vt'},{dataset:{specKey:'Sorma gücü'},value:'350 Vt'}];
 const saved=ctx.mergeCategorySpecs();assert.equal(saved['Güc'],'1600 Vt');assert.equal(saved.SKU,'keep');
 ctx.renderCategorySpecs(saved);assert(nodes.categorySpecsFields.innerHTML.includes('value="1600 Vt"'));
 ctx.preservedProductSpecs=saved;inputs[0].value='1800 Vt';inputs[1].value='';const edited=ctx.mergeCategorySpecs();assert.equal(edited['Güc'],'1800 Vt');assert(!('Sorma gücü' in edited));
 const rows=ctx.vacuumSpecEntries({brand:'Samsung',specs:edited});assert.equal(rows.length,18);assert.equal(rows[0][1],'Samsung');assert.equal(rows[9][0],'Səs səviyyəsi');assert.equal(rows[17][0],'Zəmanət');
 selected='Başqa kateqoriya';ctx.renderCategorySpecs({});assert.equal(visible,false);
 assert(!ctx.isVacuumProduct({subcategory:'Robot tozsoranlar'}));
});
