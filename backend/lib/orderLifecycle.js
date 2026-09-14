const policy = require('../../frontend/order-policy');
const statuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned'];
const transitions = { pending: ['confirmed', 'cancelled'], confirmed: ['shipped', 'cancelled'], shipped: ['delivered'], delivered: ['returned'], cancelled: [], returned: [] };
const reasons = {
  changed_mind: 'Fikrimi dəyişdim', wrong_order: 'Sifarişi səhv verdim',
  delivery: 'Çatdırılma tarixi uyğun deyil', other: 'Digər səbəb'
};
function reasonText(body) {
  if (!Object.hasOwn(reasons, body.reason)) throw Error('Səbəb seçin.');
  if (body.reason !== 'other') return reasons[body.reason];
  const detail = typeof body.details === 'string' ? body.details.trim() : '';
  if (detail.length < 3 || detail.length > 1000) throw Error('Səbəbi 3–1000 simvolla izah edin.');
  return `${reasons[body.reason]}: ${detail}`;
}
function canReturn(row, now = new Date()) {
  if (row.status !== 'delivered' || !row.deliveredAt || row.returnRequestedAt) return false;
  const elapsed = now.getTime() - new Date(row.deliveredAt).getTime();
  return elapsed >= 0 && elapsed <= policy.returnDays * 86400000;
}
function publicOrder(row, now = new Date()) {
  const { requestHash, requestKey, ...data } = row;
  return { ...data, canCancel: ['pending', 'confirmed'].includes(row.status), canReturn: canReturn(row, now) };
}
async function changeStatus(db, id, status, now = new Date()) {
  if (!Number.isSafeInteger(id) || id < 1 || !statuses.includes(status)) return false;
  return db.$transaction(async tx => {
    const row = await tx.order.findUnique({ where: { id } });
    if (!row || !(transitions[row.status] || []).includes(status)) return false;
    if (status === 'returned' && !row.returnRequestedAt) return false;
    const data = { status, ...(status === 'delivered' ? { deliveredAt: now } : {}), ...(status === 'cancelled' ? { cancelledAt: now } : {}) };
    const result = await tx.order.updateMany({ where: { id, status: row.status }, data });
    if (!result.count) return false;
    if (status === 'cancelled') await tx.creditApplication.updateMany({ where: { orderId: id }, data: { status: 'cancelled' } });
    return true;
  });
}
module.exports = { reasons, reasonText, canReturn, publicOrder, changeStatus };
