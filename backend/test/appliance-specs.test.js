const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),path=require('path');
const read=name=>fs.readFileSync(path.join(__dirname,'../../frontend',name),'utf8');
for(const [file,category,fn,count,split] of [
['appliance','Qabyuyan maşınlar','applianceSpecEntries',35,'Dərinlik'],['appliance','Dispenserlər','applianceSpecEntries',18,'Növ'],['appliance','Ətçəkən maşınlar','applianceSpecEntries',15,'Korpusun materialı'],['appliance','Mikserlər','applianceSpecEntries',15,'Turbo rejim'],['appliance','Tosterlər','applianceSpecEntries',13,'Bölmələrin sayı'],['appliance','Fritoz','applianceSpecEntries',16,'İstehsalçı ölkə'],['appliance','Ütülər','applianceSpecEntries',21,'Su qabının həcmi'],
["appliance","Sendviç və vafli hazırlayan","applianceSpecEntries",14,"Həddindən artıq qızmaya qarşı qorunma"],
["appliance","Tikiş maşınları","applianceSpecEntries",15,"Tikiş sürəti"],
["appliance","Buxarlı generatorlar","applianceSpecEntries",22,"Su qabının həcmi"],
["appliance","Yuyucu tozsoranlar","applianceSpecEntries",18,"Çıxış filtri"],
["appliance","Mikrodalğalı sobalar","applianceSpecEntries",17,"İnverter"],
["appliance","Stasionar blenderlər","applianceSpecEntries",24,"Buz doğrama imkanı"],
["appliance","Doğrayıcı","applianceSpecEntries",13,"Korpusun materialı"],
["appliance","Şirəçəkənlər","applianceSpecEntries",19,"Meyvə ləti üçün rezervuarın həcmi"],
["appliance","Termopotlar","applianceSpecEntries",19,"İstiliyin qorunması"],
["appliance","Mətbəx kombaynları","applianceSpecEntries",13,"Blender"],
["appliance","Meyvə və tərəvəz qurudan","applianceSpecEntries",12,"Çəki"],
["appliance","Hava fenləri","applianceSpecEntries",16,"Turbo rejim"],
["appliance","Fen daraqlar","applianceSpecEntries",22,"Korpusun materialı"],
["appliance","Fen maşalar","applianceSpecEntries",21,"Maşanın diametri"],
["appliance","Fen ütülər","applianceSpecEntries",21,"İonlaşma funksiyası"],
["appliance","Multistaylerlər","applianceSpecEntries",22,"İsinmə indikatoru"],
["appliance","Üz qırxanlar","applianceSpecEntries",17,"Ülgüclərin materialı"],
["appliance","Saç qırxanlar","applianceSpecEntries",20,"Enerji yığma müddəti"],
["appliance","Trimmerlər","applianceSpecEntries",15,"Ülgüclərin materialı"]])test(category+' fields and edit round trip',()=>{
 let selected=category,visible=false,inputs=[];
 const nodes={f_subcategory:{get value(){return selected}},categorySpecsPanel:{classList:{toggle:(_key,v)=>visible=v}},categorySpecsTitle:{},categorySpecsFields:{}};
 const ctx=vm.createContext({document:{getElementById:id=>nodes[id],querySelectorAll:s=>s==='.category-spec-range'?[]:inputs},escapeHtml:x=>String(x),preservedProductSpecs:{SKU:'keep'}});
 for(const f of ['washingmachine','fridge','freezer'])vm.runInContext(read(f+'-specs.js'),ctx);
 vm.runInContext(read('appliance-specs.js'),ctx);
 const admin=read('admin.js');vm.runInContext(admin.slice(admin.indexOf('function activeSpecificationTemplate()'),admin.indexOf('// ============== RƏNG SEÇİCİSİ')),ctx);
 ctx.renderCategorySpecs({});assert(visible);assert.equal((nodes.categorySpecsFields.innerHTML.match(/class="category-spec-input"/g)||[]).length,count-1);
 const [firstKey,secondKey]=ctx.activeSpecificationTemplate().groups[0].fields.slice(0,2).map(field=>field.key);
 inputs=[{dataset:{specKey:firstKey},value:'Ağ'},{dataset:{specKey:secondKey},value:'36 ay'}];let saved=ctx.mergeCategorySpecs();ctx.renderCategorySpecs(saved);assert(nodes.categorySpecsFields.innerHTML.includes('value="36 ay"'));
 ctx.preservedProductSpecs=saved;inputs[0].value='Boz';inputs[1].value='';const edited=ctx.mergeCategorySpecs();assert.equal(edited[firstKey],'Boz');assert(!(secondKey in edited));assert.equal(edited.SKU,'keep');
 const rows=ctx[fn]({subcategory:category,brand:'Bosch',specs:edited});assert.equal(rows.length,count);assert.equal(rows.find(row=>row[0]==='Brend')[1],'Bosch');assert.equal(rows[Math.ceil(count/2)][0],split);
 selected='Başqa';ctx.renderCategorySpecs({});assert.equal(visible,false);
});
