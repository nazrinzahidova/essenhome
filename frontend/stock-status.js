function isOutOfStock(product) {
 return !!product && product.stock !== null && product.stock !== undefined && product.stock !== '' && Number(product.stock) <= 0;
}
function stockBadge(product) {
 return isOutOfStock(product) ? '<span style="display:inline-block;background:#fef08a;color:#854d0e;border:1px solid #facc15;border-radius:6px;padding:4px 8px;font-size:12px;font-weight:600;margin:6px 0;">Stokda yoxdur</span>' : '';
}
function freeDeliveryBadge(product) {
 return Number(product?.price) > 200 ? '<span class="free-delivery-badge" style="position:absolute;top:8px;right:8px;z-index:10;box-sizing:border-box;max-width:calc(100% - 16px);border:1px solid #e8222e;border-radius:6px;background:#fff;color:#e8222e;padding:4px 6px;font-size:10px;font-weight:600;line-height:1.2;white-space:nowrap;pointer-events:none;">Çatdırılma pulsuzdur</span>' : '';
}
