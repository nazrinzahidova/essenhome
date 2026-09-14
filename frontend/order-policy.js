(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EssenOrderPolicy = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const freeThreshold = 199.99;
  const shippingFee = 4.99;
  const returnDays = 14;
  const creditMinimum = 199.99;
  const cutoffTime = '10:00:00+04:00';
  const deliveryDescription = 'Bakı vaxtı ilə saat 10:00-dan əvvəl həmin gün, 10:00-dan etibarən isə növbəti gündən başlayaraq çatdırılma tarixi seçilə bilər.';
  const returnDescription = 'Məhsul təhvil alındıqdan sonra 14 gün ərzində əsaslandırılmış səbəb göstərilməklə qaytarıla bilər. Müraciətdə səbəb qeyd edilməlidir.';
  function earliestDate(now = new Date()) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Baku', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
    }).formatToParts(now).map(p => [p.type, p.value]));
    const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
    if (Number(parts.hour) >= 10) date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().slice(0, 10);
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function validateDate(value, now = new Date()) {
    if (!validDate(value)) throw new Error('Çatdırılma tarixini seçin.');
    if (value < earliestDate(now)) throw new Error('Bu tarix artıq seçilə bilməz. Çatdırılma tarixini yeniləyin.');
    return value;
  }
  return { freeThreshold, shippingFee, returnDays, creditMinimum, cutoffTime, deliveryDescription, returnDescription,
    earliestDate, validDate, validateDate, shippingCost: subtotal => Number(subtotal) >= freeThreshold ? 0 : shippingFee };
});
