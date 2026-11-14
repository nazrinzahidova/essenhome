// Isolated in-memory adapter for HTTP and browser tests; never used by the app.
function createPopularCategoriesTestDb(initial=[],products=[]) {
  let rows=initial.map((row,index)=>({id:index+1,active:true,position:index,...row}));
  let next=Math.max(0,...rows.map(row=>row.id))+1;
  const select=(row,fields)=>row&&(fields?Object.fromEntries(Object.keys(fields).map(key=>[key,row[key]])):{...row});
  const unique=data=>rows.some(row=>row.category===data.category&&row.subcategory===data.subcategory);
  const db={popularCategory:{
    findMany:async({where={},select:fields})=>rows.filter(row=>where.active===undefined||row.active===where.active).sort((a,b)=>a.position-b.position||a.id-b.id).map(row=>select(row,fields)),
    findUnique:async({where,select:fields})=>select(rows.find(row=>row.id===where.id),fields)||null,
    findUniqueOrThrow:async({where,select:fields})=>{const row=rows.find(row=>row.id===where.id);if(!row)throw Object.assign(Error(),{code:'P2025'});return select(row,fields);},
    create:async({data,select:fields})=>{if(unique(data))throw Object.assign(Error(),{code:'P2002'});const row={id:next++,...data};rows.push(row);return select(row,fields);},
    update:async({where,data,select:fields})=>{const row=rows.find(row=>row.id===where.id);if(!row)throw Object.assign(Error(),{code:'P2025'});if(data.category&&rows.some(other=>other.id!==row.id&&other.category===data.category&&other.subcategory===data.subcategory))throw Object.assign(Error(),{code:'P2002'});Object.assign(row,data);return select(row,fields);}
  },product:{findFirst:async({where})=>products.find(row=>row.category===where.category&&(!where.subcategory||row.subcategory===where.subcategory))||null},$transaction:async fn=>fn(db)};
  return db;
}
module.exports={createPopularCategoriesTestDb};
