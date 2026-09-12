/* Sales category links and catalog filters share the real product taxonomy. */
window.EssenSalesCategories = (() => {
 const group=(category,names)=>(ADMIN_CATEGORY_TREE[category]||[]).filter(g=>names.includes(g.group)).flatMap(g=>g.items).map(subcategory=>({category,subcategory}));
 const category=category=>[{category}];
 const sub=(category,subcategory)=>[{category,subcategory}];
 const definitions={
  phones:{label:'Smartfonlar',placements:[...sub('Smartfonlar və aksesuarlar','Smartfonlar'),...sub('Apple','iPhone'),...sub('Gamer zona','Oyun smartfonları')]},
  tv:{label:'Televizorlar',placements:[...sub('TV, audio və foto','TV brend üzrə'),...sub('Gamer zona','Gaming TV')]},
  laptops:{label:'Notbuklar',placements:[...sub('Notbuklar, PK, planşetlər','Notbuklar'),...sub('Smartfonlar və aksesuarlar','Apple notbukları'),...sub('Gamer zona','Oyun notbukları')]},
  headphones:{label:'Qulaqlıqlar',placements:[...group('Smartfonlar və aksesuarlar',['Qulaqlıqlar']),...sub('Notbuklar, PK, planşetlər','Oyun qulaqlıqları')]},
  watches:{label:'Saatlar',placements:['Smart saatlar','Smart qolbaqlar','Qol saatları'].flatMap(s=>sub('Smart qadcetlər',s))},
  large:{label:'Böyük məişət texnikası',placements:[...group('Ev texnikası',['Ev üçün böyük texnika']),...group('Mətbəx texnikası',['Mətbəx üçün böyük texnika'])]},
  kitchen:{label:'Mətbəx üçün xırda məişət texnikası',placements:group('Mətbəx texnikası',['Mətbəx üçün kiçik texnika','İçki hazırlanması'])},
  builtin:{label:'Quraşdırılan texnika',placements:group('Mətbəx texnikası',['Quraşdırılan texnika'])},
  home:{label:'Ev üçün kiçik texnika',placements:group('Ev texnikası',['Ev üçün kiçik texnika'])},
  climate:{label:'İqlim texnikası',placements:category('Yay sərinliyi')},
  accessories:{label:'Aksessuarlar',placements:[...group('Smartfonlar və aksesuarlar',['Telefon aksesuarları']),...group('Notbuklar, PK, planşetlər',['Kompüter aksesuarları','Notbuk çantaları']),...group('TV, audio və foto',['Televizor aksesuarları']),...sub('Smart qadcetlər','Smart saat kəmərləri')]},
  beauty:{label:'Gözəllik və sağlamlıq',placements:category('Şəxsi baxım texnikası')},
  dishes:{label:'Qab-qacaq',placements:category('Qab-qacaq')}
 };
 const matches=(product,key)=>{const definition=definitions[key];if(!definition)return true;const placements=[{category:product.category,subcategory:product.subcategory},...(product.placements||[])];return placements.some(p=>definition.placements.some(f=>p.category===f.category&&(!f.subcategory||p.subcategory===f.subcategory)));};
 return {definitions,matches};
})();
