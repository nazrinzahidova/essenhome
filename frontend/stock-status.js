function isOutOfStock(product) {
 return !!product && product.stock !== null && product.stock !== undefined && product.stock !== '' && Number(product.stock) <= 0;
}
function stockBadge(product) {
 return isOutOfStock(product) ? '<span style="display:inline-block;background:#fef08a;color:#854d0e;border:1px solid #facc15;border-radius:6px;padding:4px 8px;font-size:12px;font-weight:600;margin:6px 0;">Stokda yoxdur</span>' : '';
}
function freeDeliveryBadge(product) {
 return Number(product?.price) > 200 ? '<span class="free-delivery-badge" style="position:absolute;top:8px;right:8px;z-index:10;box-sizing:border-box;max-width:calc(100% - 16px);border:1px solid #e8222e;border-radius:6px;background:#fff;color:#e8222e;padding:4px 6px;font-size:10px;font-weight:600;line-height:1.2;white-space:nowrap;pointer-events:none;">Çatdırılma pulsuzdur</span>' : '';
}

/* Rotate category hints without changing the customer's search query. */
(() => {
  function initSearchPrompts() {
    const tree = typeof ADMIN_CATEGORY_TREE !== 'undefined' ? ADMIN_CATEGORY_TREE : (typeof CATEGORY_TREE !== 'undefined' ? CATEGORY_TREE : {});
    const names = [...new Set(Object.values(tree).flatMap(groups => groups.flatMap(group => group.items?.length ? group.items : [group.group])).filter(Boolean))];
    if (!names.length) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const style = document.createElement('style');
    style.textContent = 'input[data-category-prompt]::placeholder{color:#333;opacity:1}';
    document.head.append(style);
    function bind(input) {
      if (input.dataset.categoryPrompt) return;
      input.dataset.categoryPrompt = 'true';
      const original = input.getAttribute('placeholder') || 'Axtarış...';
      let timer = null, index = 0, position = 0, erasing = false;
      const label = () => window.EssenRu ? window.EssenRu.translate(names[index]) : names[index] === 'Mini sobalar' ? 'Elektrik sobalar' : names[index];
      const stop = () => { clearTimeout(timer); timer = null; };
      function tick() {
        stop();
        if (!input.isConnected || document.hidden || input.value || document.activeElement === input) return;
        if (!input.getClientRects().length) { timer = setTimeout(tick, 1000); return; }
        const word = label();
        if (reduced.matches) { input.setAttribute('placeholder', word); return; }
        position += erasing ? -1 : 1;
        input.setAttribute('placeholder', word.slice(0, Math.max(0, position)));
        let delay = erasing ? 40 : 95;
        if (!erasing && position >= word.length) { erasing = true; delay = 1800; }
        else if (erasing && position <= 0) { erasing = false; index = (index + 1) % names.length; delay = 350; }
        timer = setTimeout(tick, delay);
      }
      input.addEventListener('focus', () => { stop(); input.setAttribute('placeholder', original); });
      input.addEventListener('input', () => { stop(); input.setAttribute('placeholder', original); });
      input.addEventListener('blur', () => { if (!input.value) { position = 0; erasing = false; tick(); } });
      document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else tick(); });
      reduced.addEventListener('change', tick);
      timer = setTimeout(tick, 500);
    }
    const scan = root => {
      if (root.nodeType !== 1 && root !== document) return;
      if (root.matches?.('#searchInput,#searchInputMobile')) bind(root);
      root.querySelectorAll?.('#searchInput,#searchInputMobile').forEach(bind);
    };
    scan(document);
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(scan))).observe(document.body, {childList:true,subtree:true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSearchPrompts, {once:true});
  else initSearchPrompts();
})();

