function calculateCredit(price, months) {
  const principal = Number(price);
  if (!Number.isFinite(principal) || principal <= 0 || ![6,9,12,15,18,24].includes(months)) return null;
  const annualRate = months <= 12 ? 32 : 34;
  const monthlyRate = annualRate / 1200;
  const principalPayment = principal / months;
  const first = principalPayment + principal * monthlyRate;
  const last = principalPayment + principalPayment * monthlyRate;
  const monthly = (first + last) / 2;
  return { monthly, annualRate, principalPayment, first, last, total: monthly * months };
}

function initCreditCalculator(price) {
  const card = document.getElementById('creditCalculator');
  if (!card) return;
  const format = value => new Intl.NumberFormat('az-AZ', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(value) + ' ₼';
  const buttons = card.querySelectorAll('[data-credit-months]');
  function update(months) {
    const result = calculateCredit(price, months);
    card.hidden = !result;
    if (!result) return;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.creditMonths) === months)));
    document.getElementById('creditMonthly').textContent = format(result.monthly);
    document.getElementById('creditSummary').textContent = `${months} ay · İllik faiz: ${result.annualRate}% · Aylıq əsas borc: ${format(result.principalPayment)} · İlk ay: ${format(result.first)} · Son ay: ${format(result.last)} · Ümumi ödəniş: ${format(result.total)}. Faiz qalan borca hesablanır. Məbləğlər təxminidir.`;
  }
  buttons.forEach(button => button.addEventListener('click', () => update(Number(button.dataset.creditMonths))));
  update(12);
}
