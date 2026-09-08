const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const frontend = path.join(__dirname, '../../frontend');
const read = name => fs.readFileSync(path.join(frontend, name), 'utf8');
const context = vm.createContext({});
vm.runInContext(read('hood-specs.js') + '\n' + read('freezer-specs.js'), context);
const entries = (fn, item) => JSON.parse(JSON.stringify(context[fn](item)));

test('category-specific rows preserve order, brand and empty values', () => {
  const hood = entries('hoodSpecEntries', { brand:'Bosch', specs:{'Məhsuldarlıq':'302 m³/saat', 'Sürət sayı':0} });
  assert.equal(hood.length, 13);
  assert.deepEqual(hood[0], ['Brend','Bosch']);
  assert.deepEqual(hood[1], ['Növ','-']);
  assert.deepEqual(hood[3], ['Məhsuldarlıq','302 m³/saat']);
  assert.deepEqual(hood[5], ['Sürət sayı',0]);
  assert.equal(hood[7][0], 'En');
  const freezer = entries('freezerSpecEntries', {specs:{Brend:'HOFFMANN', 'Faydalı həcmi':'98 lt'}});
  assert.equal(freezer.length, 27);
  assert.deepEqual(freezer[0], ['Brend','HOFFMANN']);
  assert.equal(freezer[14][0], 'Kompressor tipi');
  assert.equal(freezer[26][0], 'Zəmanət');
  assert(context.isFreezerProduct({subcategory:' Dondurucular '}));
  assert(!context.isFreezerProduct({subcategory:'Soyuducular'}));
  assert(!context.isHoodProduct({subcategory:'Dondurucular'}));
});

test('clearing a rendered field removes it while preserving unrelated stored fields', () => {
  const admin = read('admin.js');
  const start = admin.indexOf('function mergeCategorySpecs()');
  const end = admin.indexOf('// ============== RƏNG SEÇİCİSİ', start);
  const inputs = [{dataset:{specKey:'Növ'},value:''}, {dataset:{specKey:'En'},value:' 54 sm '}];
  const ctx = vm.createContext({
    preservedProductSpecs:{'Növ':'Old', 'En':'50 sm', 'SKU':'keep'},
    activeSpecificationTemplate:()=>({}),
    document:{querySelectorAll:selector=>selector === '.category-spec-range' ? [] : inputs}
  });
  vm.runInContext(admin.slice(start,end),ctx);
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.mergeCategorySpecs())), {En:'54 sm',SKU:'keep'});
});

test('admin loads both schemas and submits the existing description and specs fields', () => {
  const html=read('admin.html'), admin=read('admin.js'), product=read('product.html');
  for (const file of ['hood-specs.js','freezer-specs.js']) {
    assert(html.includes(file)); assert(product.includes(file));
  }
  assert.match(html, /<textarea id="f_description"/);
  assert(admin.includes("fd.append('description', document.getElementById('f_description').value)"));
  assert(admin.includes("fd.append('specs', JSON.stringify(collectedSpecs))"));
  assert(product.includes('Əsas göstəricilər'));
  assert(product.includes("setText('description', item.description)"));
});
