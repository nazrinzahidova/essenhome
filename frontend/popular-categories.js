(() => {
  const section=document.getElementById('popularCategories');
  if(!section)return;
  fetch('/api/popular-categories',{cache:'no-store'}).then(response=>{
    if(!response.ok)throw Error('Categories unavailable');
    return response.json();
  }).then(cards=>{
    const grid=section.querySelector('.popular-category-grid');
    for(const card of cards) {
      const link=document.createElement('a');link.className='popular-category-card';link.href=card.url;
      const image=document.createElement('img');image.src=card.image||'/img/popular-categories/category.svg';image.alt='';image.loading='lazy';image.decoding='async';image.width=150;image.height=120;
      image.addEventListener('error',()=>{image.src='/img/popular-categories/category.svg';},{once:true});
      const label=document.createElement('span');label.textContent=card.name;
      link.append(image,label);grid.append(link);
    }
    section.hidden=!cards.length;
    if(cards.length&&location.hash==='#popularCategories')section.scrollIntoView({block:'start'});
  }).catch(()=>{section.hidden=true;});
})();
