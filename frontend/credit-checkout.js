(() => {
  const style = document.createElement('style');
  style.textContent = `#creditDialog{margin:auto;width:min(520px,calc(100% - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:26px;border:0;border-radius:18px;color:#171717}#creditDialog::backdrop{background:#0008}#creditDialog h2{margin:0 30px 12px 0;font-size:21px}#creditClose{position:absolute;right:12px;top:10px;width:32px;height:32px;border:0;border-radius:50%;font-size:24px;cursor:pointer}#creditForm{display:grid;gap:14px}#creditForm[hidden]{display:none}#creditForm label{display:grid;gap:5px;font-size:14px}#creditForm input:not([type=radio]){width:100%;box-sizing:border-box;padding:11px;border:1px solid #d1d5db;border-radius:8px;font:inherit}#creditForm fieldset{border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;display:flex;gap:24px}#creditForm fieldset label{display:flex;align-items:center;gap:8px}#creditForm input[type=radio]{appearance:none;width:19px;height:19px;border:1px solid #999;border-radius:4px;display:grid;place-content:center}#creditForm input[type=radio]:checked{background:#e8222e;border-color:#e8222e}#creditForm input[type=radio]:checked::after{content:'✓';color:white;font-size:15px}#creditForm input:focus-visible{outline:2px solid #e8222e;outline-offset:2px}#creditSubmit{padding:13px;border:0;border-radius:10px;background:#e8222e;color:#fff;font:600 15px inherit;cursor:pointer}#creditSubmit:disabled{opacity:.6;cursor:wait}#creditError{color:#b91c1c;font-size:14px}#creditSuccess{line-height:1.6}#creditNotice{font-size:12px;color:#6b7280;margin:0}#creditSummary{font-size:13px;color:#4b5563;margin:0 0 16px}.checkout-options button{display:block;text-align:left;padding:14px 16px;border:1px solid #e5e7eb;border-radius:11px;color:#171717;background:white;font:inherit;font-weight:500;cursor:pointer}.checkout-options button:hover{border-color:#e8222e;background:#fff5f5}`;
  document.head.append(style);
  const dialog = document.createElement('dialog');dialog.id='creditDialog';dialog.setAttribute('aria-labelledby','creditHeading');
  dialog.innerHTML = `<button id="creditClose" type="button" aria-label="Bağla">×</button><h2 id="creditHeading">Kredit müraciəti</h2><p id="creditSummary"></p>
  <form id="creditForm">
    <label>Ad<input name="firstName" autocomplete="given-name" minlength="2" maxlength="80" required></label>
    <label>Soyad<input name="lastName" autocomplete="family-name" minlength="2" maxlength="80" required></label>
    <label>Ata adı<input name="fatherName" minlength="2" maxlength="80" required></label>
    <label>Telefon nömrəsi<input name="phone" type="tel" autocomplete="tel" placeholder="050 123 45 67" maxlength="25" required></label>
    <label>FIN kod<input name="fin" autocomplete="off" autocapitalize="characters" spellcheck="false" minlength="7" maxlength="7" pattern="[A-Za-z0-9]{7}" title="7 hərf və ya rəqəm" required></label>
    <fieldset><legend>SİMA</legend><label><input type="radio" name="hasSima" value="yes" required>Var</label><label><input type="radio" name="hasSima" value="no" required>Yoxdur</label></fieldset>
    <p id="creditNotice">Məlumatlarınız kredit müraciətinə baxılması üçün Essen Home-a göndəriləcək. Müraciətin göndərilməsi kreditin təsdiqi demək deyil.</p>
    <p id="creditError" role="alert" hidden></p><button id="creditSubmit" type="submit">Rəsmiləşdir</button>
  </form><div id="creditSuccess" role="status" hidden></div>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form'), error = document.getElementById('creditError'), success=document.getElementById('creditSuccess');
  let items=[], requestKey='', sending=false;
  document.getElementById('creditClose').onclick=()=>{if(!sending)dialog.close();};
  dialog.addEventListener('cancel',event=>{if(sending)event.preventDefault();});
  document.getElementById('creditCheckoutOption').onclick=async()=>{
    const option=document.getElementById('creditCheckoutOption');option.disabled=true;
    try {
      items=await fetchCart();
      if(!items.length){document.getElementById('checkoutDialog').close();await renderCart();return;}
      requestKey=crypto.randomUUID();form.reset();form.hidden=false;success.hidden=true;error.hidden=true;
      document.getElementById('creditSummary').textContent=items.map(i=>`${i.name} × ${i.qty}`).join(' · ');
      document.getElementById('checkoutDialog').close();dialog.showModal();
    }finally{option.disabled=false;}
  };
  form.elements.fin.addEventListener('input',()=>{form.elements.fin.value=form.elements.fin.value.toUpperCase();});
  form.onsubmit=async(event)=>{
    event.preventDefault();if(sending||!form.reportValidity())return;
    sending=true;const button=document.getElementById('creditSubmit');button.disabled=true;button.textContent='Göndərilir...';error.hidden=true;
    const values=Object.fromEntries(new FormData(form));
    try {
      const response=await fetch('/api/credit-orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,hasSima:values.hasSima==='yes',requestKey,items:items.map(i=>({productId:Number(i.id),quantity:Number(i.qty),color:i.color||''}))})});
      const data=await response.json();if(!response.ok)throw new Error(data.message||'Müraciət göndərilmədi. Yenidən cəhd edin.');
      form.reset();form.hidden=true;success.hidden=false;success.textContent=`Müraciətiniz qəbul edildi. Əməkdaşımız sizinlə əlaqə saxlayacaq. Müraciət nömrəsi: ${data.id}`;
    }catch(err){error.textContent=err.message==='Failed to fetch'?'Bağlantı alınmadı. Yenidən cəhd edin.':err.message;error.hidden=false;}
    finally{sending=false;button.disabled=false;button.textContent='Rəsmiləşdir';}
  };
})();
