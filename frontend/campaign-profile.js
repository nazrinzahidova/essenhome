(() => {
  const host=document.querySelector('.profile-content');if(!host)return;
  const section=document.createElement('section');section.style.cssText='background:#fff;border:1px solid #eee;border-radius:12px;padding:24px;margin:20px 0';
  const title=document.createElement('h2');title.textContent='Kampaniya iştiraklarım';section.append(title);
  const content=document.createElement('div');content.setAttribute('aria-live','polite');section.append(content);host.append(section);
  let version=0;
  async function load(){
    const current=++version;content.replaceChildren();const token=localStorage.getItem('token');if(!token)return;
    try{
      const response=await fetch('/api/campaigns/me',{headers:{Authorization:`Bearer ${token}`},cache:'no-store'});
      const data=await response.json();if(current!==version || token!==localStorage.getItem('token'))return;
      if(!response.ok)throw new Error(data.message || 'İştirak məlumatları yüklənmədi.');
      if(!data.length)content.textContent='Kampaniyada iştirak etmək üçün QR kodunu skan edin.';
      for(const entry of data){const p=document.createElement('p');p.style.marginTop='12px';p.textContent=`${entry.campaignName} · İştirakçı nömrəniz: ${entry.participantNumber} · ${entry.status==='active'?'Aktiv':'Ləğv edilib'}`;content.append(p);}
    }catch(e){if(current===version)content.textContent=e.message;}
  }
  window.addEventListener('essen:login',load);window.addEventListener('essen:logout',()=>{version++;content.replaceChildren();});window.addEventListener('storage',load);load();
})();
