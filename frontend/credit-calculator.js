function calculateCredit(price, months) {
  const principal = Number(price);
  if (!Number.isFinite(principal) || principal <= 0 || ![3,6,9,12,15,18,24].includes(months)) return null;
  const annualRate = months <= 12 ? 32 : 34;
  const monthlyRate = annualRate / 1200;
  // Match the supplied monthly examples: annuity rounded up to the next 0.50 AZN.
  const payment = principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  const monthly = Math.ceil(payment * 2 - 1e-9) / 2;
  return { monthly, annualRate };
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
  }
  buttons.forEach(button => button.addEventListener('click', () => update(Number(button.dataset.creditMonths))));
  update(12);
}
